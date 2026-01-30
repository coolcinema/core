import { execSync } from "child_process";
import { ICommand } from "./base.command";
import * as fs from "fs";
import * as path from "path";
import { CONFIG } from "../config";

export class GenGrpcCommand implements ICommand {
  async execute() {
    const srcDir = CONFIG.PATHS.LOCAL_CONTRACTS.GRPC;

    if (!fs.existsSync(path.resolve(srcDir))) {
      return;
    }

    try {
      console.log("🔨 Generating gRPC types...");

      execSync(`pnpm exec buf generate --path ${srcDir}`, { stdio: "inherit" });
      console.log("✅ gRPC types generated.");
    } catch (e) {
      console.error("❌ Failed to generate gRPC types.");
    }
  }
}
