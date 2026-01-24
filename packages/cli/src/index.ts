import { Command } from "commander";
import * as dotenv from "dotenv";
import { initCommand } from "./commands/init";
import { pushCommand } from "./commands/push";

dotenv.config();

const program = new Command();

program
  .name("coolcinema")
  .description("CoolCinema Platform CLI")
  .version("3.0.0");

program
  .command("init")
  .description("Create a new service manifest")
  .action(initCommand);

program
  .command("push")
  .description("Publish service configuration and contracts to the Catalog")
  .action(pushCommand);

program.parse(process.argv);
