import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { ICommand } from "./base.command";
import { CONFIG } from "../config";

export class GenHttpCommand implements ICommand {
  async execute() {
    const rootDir = process.cwd();
    const srcDir = CONFIG.PATHS.LOCAL_CONTRACTS.HTTP;
    const specOutDir = path.join(rootDir, CONFIG.PATHS.LOCAL_GEN.HTTP_SPEC);
    const clientOutDir = path.join(rootDir, CONFIG.PATHS.LOCAL_GEN.HTTP);

    if (!fs.existsSync(path.resolve(srcDir))) return;

    try {
      console.log("🔨 Generating HTTP spec...");

      execSync(`pnpm exec buf generate --path ${srcDir}`, { stdio: "inherit" });
    } catch (e) {
      console.error("❌ OpenAPI generation failed.");
      return;
    }

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
