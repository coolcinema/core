import { ICommand } from "./base.command";
import { execSync } from "child_process";
import { GenGrpcCommand } from "./gen-grpc.command";
import { GenHttpCommand } from "./gen-http.command";
import { GenEventsCommand } from "./gen-events.command";
import chalk from "chalk";
import * as path from "path";

export class GenCommand implements ICommand {
  async execute() {
    console.log("🚀 Generating all artifacts...");

    const commands = [
      new GenGrpcCommand(),
      new GenEventsCommand(),
      new GenHttpCommand(),
    ];

    const paths = commands
      .map((cmd) => cmd.getContractPath())
      .filter((p): p is string => p !== null);

    if (paths.length === 0) {
      console.log(chalk.yellow("⚠️  No contract directories found."));
      return;
    }

    const pathArgs = paths.map((p) => `--path ${p}`).join(" ");
    try {
      console.log(
        `🔨 Running buf generate for: ${paths.map((p) => path.basename(p)).join(", ")}`,
      );
      execSync(`pnpm exec buf generate ${pathArgs}`, { stdio: "inherit" });
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
