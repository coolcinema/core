import { CONFIG } from "../config";

export function getBufWorkYaml() {
  // Важно: указываем имя пакета (@coolcinema/contracts), а не путь в репо
  return `version: v1
directories:
  - ${CONFIG.PATHS.LOCAL_CONTRACTS.ROOT}
  - node_modules/@coolcinema/contracts/protos
  - node_modules/@coolcinema/contracts/events   <-- Добавить
  - node_modules/@coolcinema/contracts/schemas  <-- Добавить
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

  # HTTP (Swagger 2.0 / OpenAPI v2)
  # Используем стабильный плагин grpc-ecosystem
  - plugin: buf.build/grpc-ecosystem/openapiv2
    out: ${CONFIG.PATHS.LOCAL_GEN.HTTP_SPEC}
    opt:
      - json_names_for_fields=false
`;
}
