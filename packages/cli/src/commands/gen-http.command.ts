import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { ICommand } from "./base.command";
import { CONFIG } from "../config";
import chalk from "chalk";

export class GenHttpCommand implements ICommand {
  getContractPath(): string | null {
    const srcDir = CONFIG.PATHS.LOCAL_CONTRACTS.HTTP;
    const absPath = path.resolve(srcDir);

    if (!fs.existsSync(absPath)) return null;

    const files = fs.readdirSync(absPath).filter((f) => f.endsWith(".proto"));
    if (files.length === 0) return null;

    return srcDir;
  }

  async postProcess() {
    const rootDir = process.cwd();
    const specOutDir = path.join(rootDir, CONFIG.PATHS.LOCAL_GEN.HTTP_SPEC);
    const clientOutDir = path.join(rootDir, CONFIG.PATHS.LOCAL_GEN.HTTP);

    if (!fs.existsSync(specOutDir)) return;

    // Ищем файлы рекурсивно (Native Recursive Search)
    const specFiles = this.findSpecs(specOutDir);

    if (specFiles.length === 0) return;

    if (!fs.existsSync(clientOutDir))
      fs.mkdirSync(clientOutDir, { recursive: true });

    for (const input of specFiles) {
      const relativePath = path.relative(specOutDir, input);
      const output = path.join(
        clientOutDir,
        relativePath.replace(/\.(json|yaml)$/, ".ts"),
      );

      const outputDir = path.dirname(output);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      try {
        execSync(`pnpm exec openapi-typescript "${input}" -o "${output}"`, {
          stdio: "inherit",
        });
      } catch (e) {
        console.error(`❌ Client generation failed for ${relativePath}`);
      }
    }

    console.log("✅ HTTP client generated.");
  }

  async execute() {
    const path = this.getContractPath();
    if (!path) {
      console.log(chalk.gray(`Skipping HTTP: no .proto files`));
      return;
    }

    try {
      console.log("🔨 Generating HTTP spec...");
      execSync(`pnpm exec buf generate --path ${path}`, { stdio: "inherit" });
    } catch (e) {
      console.error("❌ OpenAPI generation failed.");
      return;
    }

    await this.postProcess();
  }

  // Native helper to find json/yaml files recursively
  private findSpecs(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);

    for (const file of list) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat && stat.isDirectory()) {
        results = results.concat(this.findSpecs(filePath));
      } else {
        if (file.endsWith(".json") || file.endsWith(".yaml")) {
          results.push(filePath);
        }
      }
    }
    return results;
  }
}
