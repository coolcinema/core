import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config();

export const CONFIG = {
  GITHUB: {
    TOKEN: process.env.COOLCINEMA_GH_PKG_TOKEN,
    OWNER: "coolcinema",
    REPO: "core",
    BRANCH: "main",
  },
  PATHS: {
    TEMPLATE: path.join(__dirname, "../templates/coolcinema.yaml"),
    MANIFEST: "coolcinema.yaml",
    REGISTRY_JSON: "packages/contracts/src/registry.json",
    CONTRACTS_ROOT: "packages/contracts",
    APPS_DIR: "packages/contracts/apps",
  },
};
