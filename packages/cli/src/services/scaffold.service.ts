import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import { CONFIG } from "../config";
import { getBufGenYaml, getBufWorkYaml } from "../templates/buf";

export class ScaffoldService {
  createStructure() {
    const dirs = [
      CONFIG.PATHS.LOCAL_CONTRACTS.GRPC,
      CONFIG.PATHS.LOCAL_CONTRACTS.HTTP,
      CONFIG.PATHS.LOCAL_CONTRACTS.EVENTS,
    ];

    dirs.forEach((dir) => {
      const fullPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(chalk.gray(`Created ${dir}`));
      }
    });
  }

  createBufConfig() {
    // 1. Workspace Config
    fs.writeFileSync(CONFIG.PATHS.BUF.WORK, getBufWorkYaml());

    // 2. Generator Config
    fs.writeFileSync(CONFIG.PATHS.BUF.GEN, getBufGenYaml());
  }
}
