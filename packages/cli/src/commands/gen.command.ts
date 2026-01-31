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

    if (fs.existsSync(bufWorkPath)) {
      console.log(chalk.cyan(`📄 Found buf.work.yaml at: ${bufWorkPath}`));
      console.log(chalk.gray("--- Content Start ---"));
      console.log(fs.readFileSync(bufWorkPath, "utf-8"));
      console.log(chalk.gray("--- Content End ---"));
    } else {
      console.error(chalk.red(`❌ buf.work.yaml NOT FOUND at ${bufWorkPath}`));
      console.error(chalk.red("   Run 'coolcinema init' to create it."));
      return;
    }

    console.log(
      chalk.yellow(
        "🔨 Executing: pnpm exec buf generate (without --path filters)",
      ),
    );
    try {
      execSync(`pnpm exec buf generate`, { stdio: "inherit" });
      console.log(chalk.green("✅ Buf generation success."));
    } catch (e: any) {
      console.error(chalk.red("❌ Buf generation failed."));
      console.error(e.message);
      process.exit(1);
    }

    console.log(chalk.magenta("🕵️  [DEBUG] Starting Post-Processing..."));

    const commands = [
      new GenGrpcCommand(),
      new GenEventsCommand(),
      new GenHttpCommand(),
    ];

    for (const cmd of commands) {
      const name = cmd.constructor.name;
      if (cmd.postProcess) {
        console.log(chalk.blue(`   Running postProcess for ${name}...`));
        await cmd.postProcess();
      } else {
        console.log(chalk.gray(`   Skipping ${name} (no postProcess)`));
      }
    }

    console.log(chalk.green("🏁 Generation pipeline finished."));
  }
}
