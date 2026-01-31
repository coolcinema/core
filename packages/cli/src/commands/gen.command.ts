import { ICommand } from "./base.command";
import { execSync } from "child_process";
import { GenGrpcCommand } from "./gen-grpc.command";
import { GenHttpCommand } from "./gen-http.command";
import { GenEventsCommand } from "./gen-events.command";
import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";
import { CONFIG } from "../config";

export class GenCommand implements ICommand {
  async execute() {
    console.log(
      chalk.magenta("🕵️  [DEBUG] Starting GenCommand (Workspace Mode)"),
    );

    const rootDir = process.cwd();
    const bufWorkPath = path.resolve(rootDir, CONFIG.PATHS.BUF.WORK);

    if (!fs.existsSync(bufWorkPath)) {
      console.error(chalk.red(`❌ buf.work.yaml NOT FOUND at ${bufWorkPath}`));
      return;
    }

    console.log(chalk.yellow("🧹 Cleaning up old artifacts..."));
    const dirsToClean = [
      path.resolve(rootDir, CONFIG.PATHS.LOCAL_GEN.GRPC),
      path.resolve(rootDir, CONFIG.PATHS.LOCAL_GEN.HTTP_SPEC),
      path.resolve(rootDir, CONFIG.PATHS.LOCAL_GEN.HTTP),
      path.resolve(rootDir, CONFIG.PATHS.LOCAL_GEN.EVENTS),
    ];

    for (const dir of dirsToClean) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });

        fs.mkdirSync(dir, { recursive: true });
      }
    }

    console.log(chalk.yellow("🔨 Executing: pnpm exec buf generate"));
    try {
      execSync(`pnpm exec buf generate`, { stdio: "inherit" });
      console.log(chalk.green("✅ Buf generation success."));
    } catch (e: any) {
      console.error(chalk.red("❌ Buf generation failed."));
      process.exit(1);
    }

    console.log(chalk.magenta("🕵️  [DEBUG] Starting Post-Processing..."));

    const commands = [
      new GenGrpcCommand(),
      new GenEventsCommand(),
      new GenHttpCommand(),
    ];

    for (const cmd of commands) {
      if (cmd.postProcess) {
        await cmd.postProcess();
      }
    }

    console.log(chalk.green("🏁 Generation pipeline finished."));
  }
}
