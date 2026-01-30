import { execSync } from "child_process";
import { ICommand } from "./base.command";
import * as fs from "fs";
import * as path from "path";

export class GenGrpcCommand implements ICommand {
  async execute() {
    const srcDir = "src/contracts/grpc";

    if (!fs.existsSync(path.resolve(srcDir))) return;

    const template = JSON.stringify({
      version: "v1",
      plugins: [
        {
          plugin: "ts-proto",
          path: "./node_modules/.bin/protoc-gen-ts_proto",
          out: "src/_gen/grpc",
          opt: [
            "outputServices=nice-grpc",
            "outputServices=generic-definitions",
            "useExactTypes=false",
            "esModuleInterop=true",
          ],
        },
      ],
    });

    try {
      console.log("🔨 Generating gRPC types...");

      execSync(
        `pnpm exec buf generate --path ${srcDir} --template '${template}'`,
        { stdio: "inherit" },
      );
      console.log("✅ gRPC types generated.");
    } catch (e) {
      console.error("❌ Failed to generate gRPC types.");
    }
  }
}
