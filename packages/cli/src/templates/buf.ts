import { CONFIG } from "../config";

export function getBufWorkYaml() {
  return `version: v1
directories:
  - ${CONFIG.PATHS.LOCAL_CONTRACTS.ROOT}
  - node_modules/${CONFIG.PATHS.CONTRACTS_ROOT}/protos
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

  # HTTP (OpenAPI Spec v3)
  - plugin: buf.build/google/gnostic
    out: ${CONFIG.PATHS.LOCAL_GEN.HTTP_SPEC}
    opt:
      - openapi_out=openapi.yaml
`;
}
