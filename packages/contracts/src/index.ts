import registryData from "./registry.json";

export interface ServiceContract {
  file: string;
  port: number;
}

export interface ServiceDef {
  slug: string;
  host: string;
  grpc?: Record<string, ServiceContract>;
  http?: Record<string, { spec: string; port: number }>;
}

export type RegistryType = Record<string, ServiceDef>;

export const Registry: RegistryType = registryData.services;

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
