import { execSync } from "child_process";
import { ICommand } from "./base.command";
import * as fs from "fs";
import * as path from "path";

export class GenEventsCommand implements ICommand {
  async execute() {
    const srcDir = "src/contracts/events";
    if (!fs.existsSync(path.resolve(srcDir))) return;

    const template = JSON.stringify({
      version: "v1",
      plugins: [
        {
          plugin: "ts-proto",
          path: "./node_modules/.bin/protoc-gen-ts_proto",
          out: "src/_gen/events",
          opt: [
            "outputServices=generic-definitions", // Нам нужны Definitions для Factory
            "useExactTypes=false",
            "esModuleInterop=true",
          ],
        },
      ],
    });

    try {
      console.log("🔨 Generating Events types...");
      execSync(
        `pnpm exec buf generate --path ${srcDir} --template '${template}'`,
        { stdio: "inherit" },
      );
      console.log("✅ Events types generated.");
    } catch (e) {
      console.error("❌ Failed to generate events.");
    }
  }
}
