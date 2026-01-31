import { execSync } from "child_process";
import { ICommand } from "./base.command";
import * as fs from "fs";
import * as path from "path";
import { CONFIG } from "../config";
import chalk from "chalk";

export class GenGrpcCommand implements ICommand {
  getContractPath(): string | null {
    const srcDir = CONFIG.PATHS.LOCAL_CONTRACTS.GRPC;
    const absPath = path.resolve(srcDir);

    if (!fs.existsSync(absPath)) return null;

    const files = fs.readdirSync(absPath).filter((f) => f.endsWith(".proto"));
    if (files.length === 0) return null;

    return srcDir;
  }

  async postProcess() {}

  async execute() {
    const path = this.getContractPath();
    if (!path) {
      console.log(chalk.gray(`Skipping gRPC: no .proto files`));
      return;
    }

    try {
      console.log("🔨 Generating gRPC types...");
      execSync(`pnpm exec buf generate --path ${path}`, { stdio: "inherit" });
      await this.postProcess();
      console.log("✅ gRPC types generated.");
    } catch (e) {
      console.error("❌ Failed to generate gRPC types.");
    }
  }
}
