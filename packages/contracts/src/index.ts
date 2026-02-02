import * as registryData from "./registry.json";
import * as infrastructureData from "./infrastructure.json";

export interface ServiceContract {
  files: string[];
  port: number;
}

export interface ServiceDef {
  slug: string;
  host: string;
  grpc?: Record<string, ServiceContract>;
  http?: Record<string, { spec: string; port: number }>;
  events?: any;
}

export interface InfrastructureConfig {
  rabbitmq: { uri: string; exchanges?: string[] };
  jaeger: { endpoint: string };
}

export interface RegistryConfig {
  services: Record<string, ServiceDef>;
  infrastructure: InfrastructureConfig;
}

const services: Record<string, ServiceDef> = {
  ...(registryData.services as any),
};

Object.keys(services).forEach((key) => {
  if (key.endsWith("-service")) {
    const shortName = key.replace("-service", "");
    const camelName = shortName.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

    if (!services[shortName]) {
      services[shortName] = services[key];
    }
  }
});

export const Registry: RegistryConfig = {
  services: services,
  infrastructure: infrastructureData.infrastructure,
};

export function getGrpcAddress(
  service: ServiceDef,
  interfaceName = "main",
): string {
  if (!service.grpc || !service.grpc[interfaceName]) {
    throw new Error(
      `gRPC interface '${interfaceName}' not found for ${service.slug}`,
    );
  }
  return `${service.host}:${service.grpc[interfaceName].port}`;
}
