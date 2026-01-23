import {
  createServer,
  createClientFactory,
  createChannel,
  ChannelCredentials,
} from "nice-grpc";
import { CompatServiceDefinition } from "nice-grpc/lib/service-definitions";
import { contextClientMiddleware } from "./client-interceptor";
import { contextServerMiddleware } from "./server-utils";

// --- Client Factory ---

export function createGrpcClient<Client>(
  definition: CompatServiceDefinition,
  address: string,
): Client {
  // 1. Создаем канал
  const channel = createChannel(address, ChannelCredentials.createInsecure());

  // 2. Создаем фабрику с мидлварями
  const clientFactory = createClientFactory().use(contextClientMiddleware);

  // 3. Создаем клиент
  return clientFactory.create(definition, channel) as Client;
}

// --- Server Factory ---

export class PlatformGrpcServer {
  private server = createServer().use(contextServerMiddleware); // Подключаем глобальный мидлварь

  async listen(port: number) {
    return this.server.listen(`0.0.0.0:${port}`);
  }

  addService<T>(definition: CompatServiceDefinition, implementation: T) {
    // В nice-grpc не нужно оборачивать implementation вручную
    this.server.add(definition, implementation as any);
  }
}
