import inquirer from "inquirer";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { ServiceManifest } from "../types";

export const initCommand = async () => {
  console.log("🎬 Initializing CoolCinema Service Manifest...\n");

  const cwd = process.cwd();
  const folderName = path.basename(cwd);

  // Ищем proto файлы, чтобы предложить выбор
  const findProtoFiles = (dir: string, fileList: string[] = []) => {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (
        stat.isDirectory() &&
        file !== "node_modules" &&
        file !== ".git" &&
        file !== "dist"
      ) {
        findProtoFiles(filePath, fileList);
      } else if (file.endsWith(".proto")) {
        fileList.push(path.relative(cwd, filePath));
      }
    });
    return fileList;
  };

  const protoFiles = findProtoFiles(cwd);

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "name",
      message: "Service Name (PascalCase):",
      default:
        folderName.charAt(0).toUpperCase() +
        folderName.slice(1).replace(/-service$/, ""),
      validate: (input) =>
        /^[A-Z][a-zA-Z0-9]+$/.test(input) || "Must be PascalCase",
    },
    {
      type: "input",
      name: "slug",
      message: "K8s Service Name (kebab-case):",
      default: (ans) => `${ans.name.toLowerCase()}-service`,
    },
    {
      type: "number",
      name: "port",
      message: "Service Port:",
      default: 3000,
    },
    {
      type: "input",
      name: "description",
      message: "Description:",
    },
    {
      type: "list",
      name: "protoPath",
      message: "Select main .proto file (optional):",
      choices: [...protoFiles, "None"],
      when: protoFiles.length > 0,
    },
  ]);

  const manifest: ServiceManifest = {
    service: {
      name: answers.name,
      slug: answers.slug,
      description: answers.description,
      port: answers.port,
      language: "typescript",
    },
  };

  if (answers.protoPath && answers.protoPath !== "None") {
    manifest.contracts = {
      proto: answers.protoPath,
    };
  }

  const yamlStr = yaml.dump(manifest);
  fs.writeFileSync(path.join(cwd, "coolcinema.yaml"), yamlStr);

  console.log("\n✅ coolcinema.yaml created successfully!");
  console.log('👉 Now run "coolcinema service push" to sync with Core.');
};
