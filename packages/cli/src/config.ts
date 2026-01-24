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
  },
};
