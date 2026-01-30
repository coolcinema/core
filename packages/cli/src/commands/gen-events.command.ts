import { execSync } from "child_process";
import { ICommand } from "./base.command";
import * as fs from "fs";
import * as path from "path";
import { CONFIG } from "../config";

export class GenEventsCommand implements ICommand {
  async execute() {
    const srcDir = CONFIG.PATHS.LOCAL_CONTRACTS.EVENTS;
    if (!fs.existsSync(path.resolve(srcDir))) return;

    try {
      console.log("🔨 Generating Events types...");
      execSync(`pnpm exec buf generate --path ${srcDir}`, { stdio: "inherit" });
      console.log("✅ Events types generated.");
    } catch (e) {
      console.error("❌ Failed to generate events.");
    }
  }
}
