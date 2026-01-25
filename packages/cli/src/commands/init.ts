import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import { generateTemplate } from "../manifest/generator";

export const initCommand = async () => {
  const targetPath = path.join(process.cwd(), "coolcinema.yaml");
  if (fs.existsSync(targetPath)) {
    console.error(chalk.red("❌ coolcinema.yaml already exists"));
    process.exit(1);
  }

  const dirName = path.basename(process.cwd());
  const name = toPascalCase(dirName);
  const slug = dirName;

  const content = generateTemplate(name, slug);

  fs.writeFileSync(targetPath, content);
  console.log(chalk.green("✅ Created coolcinema.yaml from schemas"));
};

function toPascalCase(str: string) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (w) => w.toUpperCase())
    .replace(/[\s\-_]+/g, "");
}
