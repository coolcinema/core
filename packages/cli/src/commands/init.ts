import * as fs from "fs";
import * as path from "path";
import inquirer from "inquirer";
import * as yaml from "js-yaml";
import chalk from "chalk";
import { ServiceManifest } from "../types";

export const initCommand = async () => {
  const manifestPath = path.join(process.cwd(), "coolcinema.yaml");

  if (fs.existsSync(manifestPath)) {
    console.log(chalk.yellow("⚠️  coolcinema.yaml already exists."));
    const { overwrite } = await inquirer.prompt([
      {
        type: "confirm",
        name: "overwrite",
        message: "Do you want to overwrite it?",
        default: false,
      },
    ]);
    if (!overwrite) return;
  }

  const currentDirName = path.basename(process.cwd());

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "name",
      message: "Service Name (PascalCase):",
      default: toPascalCase(currentDirName), // Helper needed or simple logic
      validate: (input) =>
        /^[A-Z][a-zA-Z0-9]+$/.test(input) ||
        "Must be PascalCase (e.g. Identity)",
    },
    {
      type: "input",
      name: "slug",
      message: "Service Slug (kebab-case):",
      default: (ans: any) => {
        const kebab = toKebabCase(ans.name);
        return kebab.endsWith("-service") ? kebab : `${kebab}-service`;
      },
    },
    {
      type: "input",
      name: "repository",
      message: "Repository Name (for registry file):",
      default: (ans: any) => ans.slug, // По умолчанию совпадает со слагом
    },
    {
      type: "number",
      name: "port",
      message: "Service Port:",
      default: 5000,
    },
    {
      type: "input",
      name: "description",
      message: "Description:",
    },
    {
      type: "list",
      name: "language",
      message: "Language:",
      choices: ["typescript", "go", "python"],
      default: "typescript",
    },
  ]);

  const manifest: ServiceManifest = {
    version: "1.0.0",
    service: {
      name: answers.name,
      slug: answers.slug,
      repository: answers.repository,
      description: answers.description,
      port: answers.port,
      language: answers.language,
    },
  };

  fs.writeFileSync(manifestPath, yaml.dump(manifest));
  console.log(
    chalk.green(`\n✅ Generated coolcinema.yaml for ${answers.name}`),
  );
};

// Helpers
function toPascalCase(str: string) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
    .replace(/\s+/g, "")
    .replace(/-/g, "");
}

function toKebabCase(str: string) {
  return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}
