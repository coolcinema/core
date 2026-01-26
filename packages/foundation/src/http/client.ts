import createFetchClient, { Client } from "openapi-fetch";
import { getCurrentContext } from "../context/store";
import { Propagator } from "../context/propagator";

export function createClient<Paths extends {}>(
  registry: any,
  serviceSlug: string,
  interfaceName: string = "main", // Имя интерфейса (секции http) по умолчанию
): Client<Paths> {
  const serviceConfig = registry.services[serviceSlug];

  if (!serviceConfig) {
    throw new Error(`Service '${serviceSlug}' not found in Registry`);
  }

  // Строгий выбор порта из контракта
  const interfaceConfig = serviceConfig.http?.[interfaceName];

  if (!interfaceConfig || !interfaceConfig.port) {
    throw new Error(
      `HTTP Interface '${interfaceName}' not found (or has no port) for service '${serviceSlug}'. ` +
        `Check coolcinema.yaml: http.${interfaceName}`,
    );
  }

  const baseURL = `http://${serviceConfig.host}:${interfaceConfig.port}`;

  // Создаем клиент
  const client = createFetchClient<Paths>({
    baseUrl: baseURL,
    // Типизированный custom fetch
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      // Нормализация заголовков (могут быть undefined или Headers)
      const headers = new Headers(init?.headers);

      // Inject Context
      const ctx = getCurrentContext();
      Propagator.inject(ctx, (key, values) => {
        values.forEach((v) => headers.append(key, v));
      });

      return fetch(input, {
        ...init,
        headers,
      });
    },
  });

  return client;
}
