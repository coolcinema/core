import { execSync } from "child_process";
import { ICommand } from "./base.command";
import * as fs from "fs";
import * as path from "path";
import { CONFIG } from "../config";
import chalk from "chalk";

export class GenEventsCommand implements ICommand {
  async execute() {
    const srcDir = CONFIG.PATHS.LOCAL_CONTRACTS.EVENTS;
    const absPath = path.resolve(srcDir);

    if (!fs.existsSync(absPath)) return;

    const files = fs.readdirSync(absPath).filter((f) => f.endsWith(".proto"));
    if (files.length === 0) {
      console.log(chalk.gray(`Skipping Events: no .proto files in ${srcDir}`));
      return;
    }

    try {
      console.log("🔨 Generating Events types...");
      execSync(`pnpm exec buf generate --path ${srcDir}`, { stdio: "inherit" });
      console.log("✅ Events types generated.");
    } catch (e) {
      console.error("❌ Failed to generate events.");
    }
  }
}
