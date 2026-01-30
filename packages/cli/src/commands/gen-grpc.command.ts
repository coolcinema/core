import * as path from "path";
import * as fs from "fs";
import { execSync } from "child_process";
import chalk from "chalk";
import { ICommand } from "./base.command";

export class GenGrpcCommand implements ICommand {
  async execute() {
    console.log(chalk.blue("🔨 Generating gRPC types..."));

    const contractsDir = path.resolve(
      "node_modules/@coolcinema/contracts/protos",
    );
    const outDir = path.resolve("src/_gen/grpc");

    if (!fs.existsSync(contractsDir)) {
      console.log(chalk.yellow("⚠️ No gRPC contracts found in node_modules."));
      return;
    }

    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const files = fs
      .readdirSync(contractsDir)
      .filter((f) => f.endsWith(".proto"))
      .map((f) => path.join(contractsDir, f));

    if (files.length === 0) return;

    const pluginPath = path.resolve("node_modules/.bin/protoc-gen-ts_proto");

    const cmd = [
      "protoc",
      `--plugin=protoc-gen-ts_proto=${pluginPath}`,
      `--ts_proto_out=${outDir}`,
      `--ts_proto_opt=outputServices=nice-grpc,outputServices=generic-definitions,useExactTypes=false,esModuleInterop=true`,
      `-I ${contractsDir}`,
      ...files,
    ].join(" ");

    try {
      execSync(cmd, { stdio: "inherit" });
      console.log(chalk.green("✅ gRPC types generated."));
    } catch (e: any) {
      console.error(chalk.red("❌ Failed to generate gRPC types:"), e.message);
    }
  }
}
