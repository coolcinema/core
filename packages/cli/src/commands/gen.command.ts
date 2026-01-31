import { ICommand } from "./base.command";
import { execSync } from "child_process";
import { GenGrpcCommand } from "./gen-grpc.command";
import { GenHttpCommand } from "./gen-http.command";
import { GenEventsCommand } from "./gen-events.command";
import chalk from "chalk";
import * as fs from "fs";
import { CONFIG } from "../config";

export class GenCommand implements ICommand {
  async execute() {
    console.log("🚀 Generating all artifacts...");

    const commands = [
      new GenGrpcCommand(),
      new GenEventsCommand(),
      new GenHttpCommand(),
    ];

    if (!fs.existsSync(CONFIG.PATHS.BUF.WORK)) {
      console.error(
        chalk.red("❌ buf.work.yaml not found. Run 'coolcinema init' first."),
      );
      return;
    }

    try {
      console.log(`🔨 Running buf generate (workspace)...`);
      execSync(`pnpm exec buf generate`, { stdio: "inherit" });
      console.log("✅ Buf generation complete.");
    } catch (e) {
      console.error("❌ Buf generation failed.");
      process.exit(1);
    }

    for (const cmd of commands) {
      await cmd.postProcess();
    }
  }
}
