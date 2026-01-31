import { Command } from "commander";
import * as dotenv from "dotenv";
import { ManifestService } from "./services/manifest.service";
import { RegistryService } from "./services/registry.service";
import { InfraService } from "./services/infra.service";
import { GitHubService } from "./services/github.service";
import { ScaffoldService } from "./services/scaffold.service";
import { handlers } from "./handlers";

// Commands
import { InitCommand } from "./commands/init.command";
import { PushCommand } from "./commands/push.command";
import { HostsCommand } from "./commands/hosts.command";
import { GenCommand } from "./commands/gen.command";
import { GenGrpcCommand } from "./commands/gen-grpc.command";
import { GenHttpCommand } from "./commands/gen-http.command";
import { GenEventsCommand } from "./commands/gen-events.command";

dotenv.config();

const program = new Command();

program
  .name("coolcinema")
  .description("CoolCinema Platform CLI")
  .version("3.0.0");

// Services
const manifestService = new ManifestService(handlers);
const scaffoldService = new ScaffoldService();
const ghService = new GitHubService();

// --- Core Workflow ---

program
  .command("init")
  .description("Create a new service manifest")
  .action(async () => {
    const cmd = new InitCommand(manifestService, scaffoldService);
    await cmd.execute();
  });

program
  .command("push")
  .description("Publish service configuration and contracts to the Catalog")
  .action(async () => {
    const registryService = new RegistryService(ghService);
    const infraService = new InfraService();

    const cmd = new PushCommand(
      manifestService,
      registryService,
      infraService,
      ghService,
      handlers,
    );
    await cmd.execute();
  });

// --- Code Generation ---

program
  .command("gen")
  .description("Generate ALL types (gRPC, Events, HTTP)")
  .action(async () => {
    const cmd = new GenCommand(); // Используем наш новый класс-агрегатор
    await cmd.execute();
  });

program
  .command("gen:grpc")
  .description("Generate gRPC types only")
  .action(async () => {
    const cmd = new GenGrpcCommand();
    await cmd.execute();
  });

program
  .command("gen:http")
  .description("Generate HTTP types only")
  .action(async () => {
    const cmd = new GenHttpCommand();
    await cmd.execute();
  });

program
  .command("gen:events")
  .description("Generate Events types only")
  .action(async () => {
    const cmd = new GenEventsCommand();
    await cmd.execute();
  });

// --- Utilities ---

program
  .command("hosts")
  .description("Generate /etc/hosts configuration")
  .action(async () => {
    const registryService = new RegistryService(ghService);
    const cmd = new HostsCommand(registryService);
    await cmd.execute();
  });

program.parse(process.argv);
