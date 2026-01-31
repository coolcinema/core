import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { CONFIG } from "../config";
import chalk from "chalk";

export class BufRunner {
  constructor(private rootDir: string) {}

  clean() {
    const genPaths = Object.values(CONFIG.PATHS.LOCAL_GEN);
    genPaths.forEach((relativePath) => {
      const absPath = path.resolve(this.rootDir, relativePath);
      if (fs.existsSync(absPath)) {
        fs.rmSync(absPath, { recursive: true, force: true });
      }
      fs.mkdirSync(absPath, { recursive: true });
    });
  }

  run(): boolean {
    console.log(chalk.yellow("🔨 Running buf generate..."));
    try {
      execSync(`pnpm exec buf generate`, { stdio: "inherit" });
      console.log(chalk.green("✅ Buf generation success."));
      return true;
    } catch (e) {
      console.error(chalk.red("❌ Buf generation failed."));
      return false;
    }
  }
}
