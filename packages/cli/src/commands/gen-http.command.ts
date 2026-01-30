import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import chalk from "chalk";
import { ICommand } from "./base.command";

export class GenHttpCommand implements ICommand {
  async execute() {
    console.log(chalk.blue("🔨 Generating HTTP types..."));

    const contractsDir = path.resolve(
      "node_modules/@coolcinema/contracts/schemas",
    );
    const outDir = path.resolve("src/_gen/http");

    if (!fs.existsSync(contractsDir)) {
      console.error(
        chalk.red(
          `❌ Contracts not found at ${contractsDir}. Install @coolcinema/contracts.`,
        ),
      );
      return; // Не падаем, просто выходим
    }

    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    console.log(chalk.blue(`🔍 Scanning schemas in ${contractsDir}...`));

    const files = fs
      .readdirSync(contractsDir)
      .filter((f) => f.endsWith(".yaml") || f.endsWith(".json"));

    if (files.length === 0) {
      console.log(chalk.yellow("No schemas found."));
      return;
    }

    for (const file of files) {
      const name = path.basename(file, path.extname(file));
      const input = path.join(contractsDir, file);
      const output = path.join(outDir, `${name}.d.ts`);

      console.log(`Generating types for ${chalk.bold(name)}...`);

      try {
        execSync(`pnpm exec openapi-typescript "${input}" -o "${output}"`, {
          stdio: "inherit",
        });
      } catch (e: any) {
        console.error(chalk.red(`❌ Failed to generate ${name}:`), e.message);
      }
    }

    console.log(chalk.green("✅ HTTP types generation complete."));
  }
}
