import { ICommand } from "./base.command";
import { execSync } from "child_process";
import { GenGrpcCommand } from "./gen-grpc.command";
import { GenHttpCommand } from "./gen-http.command";
import { GenEventsCommand } from "./gen-events.command";
import { NodeModulesConflictResolver } from "../services/conflict-resolver.service";
import { CONFIG } from "../config";
import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";

export class GenCommand implements ICommand {
  private conflictResolver = new NodeModulesConflictResolver();

  async execute() {
    const rootDir = process.cwd();

    // 1. Pre-flight checks
    if (!this.checkBufConfig(rootDir)) return;

    // 2. Resolve Conflicts (Clean self-copies from node_modules)
    await this.conflictResolver.resolve(rootDir);

    // 3. Clean Output Dirs
    this.cleanArtifacts(rootDir);

    // 4. Generate
    if (!this.runBuf()) return;

    // 5. Post-Process
    await this.runPostProcessors();

    console.log(chalk.green("🏁 Generation complete."));
  }

  private checkBufConfig(rootDir: string): boolean {
    const bufPath = path.resolve(rootDir, CONFIG.PATHS.BUF.WORK);
    if (!fs.existsSync(bufPath)) {
      console.error(chalk.red(`❌ ${CONFIG.PATHS.BUF.WORK} not found.`));
      return false;
    }
    return true;
  }

  private cleanArtifacts(rootDir: string) {
    console.log(chalk.gray("🧹 Cleaning artifacts..."));

    // Динамически берем все пути из конфига генерации
    const genPaths = Object.values(CONFIG.PATHS.LOCAL_GEN);

    genPaths.forEach((relativePath) => {
      const absPath = path.resolve(rootDir, relativePath);
      // Удаляем и пересоздаем
      fs.rmSync(absPath, { recursive: true, force: true });
      fs.mkdirSync(absPath, { recursive: true });
    });
  }

  private runBuf(): boolean {
    console.log(chalk.yellow("🔨 Running buf generate..."));
    try {
      execSync(`pnpm exec buf generate`, { stdio: "inherit" });
      return true;
    } catch (e) {
      console.error(chalk.red("❌ Buf failed."));
      return false;
    }
  }

  private async runPostProcessors() {
    const strategies = [
      new GenGrpcCommand(),
      new GenEventsCommand(),
      new GenHttpCommand(),
    ];

    for (const cmd of strategies) {
      if (cmd.postProcess) await cmd.postProcess();
    }
  }
}
