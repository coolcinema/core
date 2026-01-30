import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { ICommand } from "./base.command";

export class GenHttpCommand implements ICommand {
  async execute() {
    const rootDir = process.cwd();
    const srcDir = "src/contracts/http";
    const specOutDir = path.join(rootDir, "src/_gen/http-spec");
    const clientOutDir = path.join(rootDir, "src/_gen/http");

    if (!fs.existsSync(path.resolve(srcDir))) return;

    // 1. Generate OpenAPI v3 Spec from Proto
    // Используем google/gnostic для генерации v3.0
    const template = JSON.stringify({
      version: "v1",
      plugins: [
        {
          remote: "buf.build/google/gnostic",
          out: "src/_gen/http-spec",
          opt: ["openapi_out=openapi.yaml"], // Gnostic specific flag
        },
      ],
    });

    try {
      console.log("🔨 Generating HTTP spec (OpenAPI v3)...");
      execSync(
        `pnpm exec buf generate --path ${srcDir} --template '${template}'`,
        { stdio: "inherit" },
      );
    } catch (e) {
      console.error("❌ OpenAPI generation failed.");
      return;
    }

    // 2. Generate TS Client
    if (!fs.existsSync(clientOutDir))
      fs.mkdirSync(clientOutDir, { recursive: true });

    const specFiles = fs
      .readdirSync(specOutDir)
      .filter((f) => f.endsWith(".json") || f.endsWith(".yaml"));

    for (const file of specFiles) {
      const input = path.join(specOutDir, file);
      const output = path.join(
        clientOutDir,
        file.replace(/\.(json|yaml)$/, ".ts"),
      );

      execSync(`pnpm exec openapi-typescript "${input}" -o "${output}"`, {
        stdio: "inherit",
      });
    }

    console.log("✅ HTTP client generated.");
  }
}
