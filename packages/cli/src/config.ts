import * as dotenv from "dotenv";

dotenv.config();

export const CONFIG = {
  GITHUB: {
    TOKEN: process.env.COOLCINEMA_GH_PKG_TOKEN,
    OWNER: "coolcinema",
    REPO: "core",
    BRANCH: "main",
  },
  PATHS: {
    MANIFEST: "coolcinema.yaml",
    REGISTRY_JSON: "packages/contracts/src/registry.json",
    CONTRACTS_ROOT: "packages/contracts",
    APPS_DIR: "packages/contracts/apps",
    APP_EXT: ".json",
    // New: Proto-First Structure
    LOCAL_CONTRACTS: {
      ROOT: "src/contracts",
      GRPC: "src/contracts/grpc",
      HTTP: "src/contracts/http",
      EVENTS: "src/contracts/events",
    },
    LOCAL_GEN: {
      ROOT: "src/_gen",
      GRPC: "src/_gen/grpc",
      HTTP: "src/_gen/http",
      HTTP_SPEC: "src/_gen/http-spec",
      EVENTS: "src/_gen/events",
    },
    BUF: {
      WORK: "buf.work.yaml",
      GEN: "buf.gen.yaml",
    },
  },
  INFRA_DOMAINS: ["argo.coolcinema.local", "jaeger.coolcinema.local"],
};
