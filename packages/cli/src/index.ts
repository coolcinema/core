import { Command } from "commander";
import * as dotenv from "dotenv";
import { ManifestService } from "./services/manifest.service";
import { RegistryService } from "./services/registry.service";
import { InfraService } from "./services/infra.service";
import { InitCommand } from "./commands/init.command";
import { PushCommand } from "./commands/push.command";
import { handlers } from "./handlers";
import { GitHubService } from "./services/github.service";
import { HostsCommand } from "./commands/hosts.command";
import { GenHttpCommand } from "./commands/gen-http.command";

dotenv.config();

const program = new Command();

program
  .name("coolcinema")
  .description("CoolCinema Platform CLI")
  .version("3.0.0");

// --- Dependency Injection ---
// Singleton Services
const manifestService = new ManifestService(handlers);
const ghService = new GitHubService(); // Lazy init inside if needed, or check env here

// --- Commands ---

program
  .command("init")
  .description("Create a new service manifest")
  .action(async () => {
    const cmd = new InitCommand(manifestService);
    await cmd.execute();
  });

program
  .command("push")
  .description("Publish service configuration and contracts to the Catalog")
  .action(async () => {
    // Services per execution scope (Transient)
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

program
  .command("hosts")
  .description("Generate /etc/hosts configuration")
  .action(async () => {
    const registryService = new RegistryService(ghService);
    const cmd = new HostsCommand(registryService);
    await cmd.execute();
  });

program
  .command("gen-http")
  .description("Generate TypeScript types from OpenAPI schemas")
  .action(async () => {
    const cmd = new GenHttpCommand();
    await cmd.execute();
  });

program.parse(process.argv);
