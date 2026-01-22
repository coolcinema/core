#!/usr/bin/env node
import { Command } from "commander";
import * as dotenv from "dotenv";
import { initCommand } from "./commands/init";
import { pushCommand } from "./commands/push";

dotenv.config();

const program = new Command();

program
  .name("coolcinema")
  .description("CoolCinema Infrastructure CLI")
  .version("2.0.0");

// Группа команд service
const service = program
  .command("service")
  .description("Manage microservices configuration");

service
  .command("init")
  .description("Initialize coolcinema.yaml in current directory")
  .action(initCommand);

service
  .command("push")
  .description("Push service manifest and contracts to Core")
  .action(pushCommand);

program.parse(process.argv);

// #!/usr/bin/env node
// import { Command } from "commander";
// import inquirer from "inquirer";
// import { Octokit } from "@octokit/rest";
// import * as dotenv from "dotenv";
//
// dotenv.config();
//
// const program = new Command();
// const octokit = new Octokit({ auth: process.env.COOLCINEMA_GH_PKG_TOKEN });
//
// program
//   .name("coolcinema")
//   .description("CoolCinema Infrastructure CLI")
//   .version("1.0.0");
//
// program
//   .command("register")
//   .description("Register a new microservice in the Core Registry")
//   .action(async () => {
//     console.log("🎬 Welcome to CoolCinema Registry Manager\n");
//
//     const answers = await inquirer.prompt([
//       {
//         type: "input",
//         name: "name",
//         message: "Service Name (PascalCase, e.g. Sales):",
//         validate: (input) =>
//           /^[A-Z][a-zA-Z0-9]+$/.test(input) || "Must be PascalCase",
//       },
//       {
//         type: "input",
//         name: "slug",
//         message: "K8s Service Name (kebab-case, e.g. sales-service):",
//         default: (ans) => `${ans.name.toLowerCase()}-service`,
//       },
//       {
//         type: "number",
//         name: "port",
//         message: "Service Port:",
//         default: 3000,
//       },
//       {
//         type: "input",
//         name: "description",
//         message: "Description:",
//       },
//     ]);
//
//     const content = JSON.stringify(answers, null, 2);
//     const path = `packages/registry/definitions/${answers.name.toLowerCase()}.json`;
//
//     try {
//       // Пытаемся создать файл в репозитории напрямую
//       await octokit.repos.createOrUpdateFileContents({
//         owner: "coolcinema",
//         repo: "core",
//         path: path,
//         message: `feat(registry): register ${answers.name} service`,
//         content: Buffer.from(content).toString("base64"),
//         // branch: 'main' // Укажите ветку, если не default
//       });
//
//       console.log(`\n✅ Service ${answers.name} registered successfully!`);
//       console.log(
//         `🚀 CI/CD will now rebuild and publish @coolcinema/registry.`,
//       );
//     } catch (error: any) {
//       console.error(
//         "\n❌ Error registering service:",
//         error.response?.data?.message || error.message,
//       );
//     }
//   });
//
// program.parse(process.argv);
