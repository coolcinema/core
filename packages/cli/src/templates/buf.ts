import { CONFIG } from "../config";

export function getBufWorkYaml() {
  // Важно: указываем имя пакета (@coolcinema/contracts), а не путь в репо
  return `version: v1
directories:
  - ${CONFIG.PATHS.LOCAL_CONTRACTS.ROOT}
  - node_modules/@coolcinema/contracts/protos
  - node_modules/@coolcinema/contracts/events
  - node_modules/@coolcinema/contracts/schemas
`;
}

export function getBufGenYaml() {
  return `version: v1
plugins:
  # gRPC & Events (TS Code)
  - plugin: ts-proto
    out: ${CONFIG.PATHS.LOCAL_GEN.GRPC}
    opt:
      - outputServices=nice-grpc
      - outputServices=generic-definitions
      - useExactTypes=false
      - esModuleInterop=true
    path: ./node_modules/.bin/protoc-gen-ts_proto

  # HTTP (OpenAPI v3.0)
  # Официальный плагин для генерации v3
  - plugin: buf.build/grpc-ecosystem/openapiv3
    out: ${CONFIG.PATHS.LOCAL_GEN.HTTP_SPEC}
    opt:
      - output_format=json
`;
}
