import chalk from "chalk";
import { ICommand } from "./base.command";
import { CONFIG } from "../config";
import { RegistryService } from "../services/registry.service";
import { InfraService } from "../services/infra.service";
import { ManifestService } from "../services/manifest.service";
import { HandlerModule, PushContext } from "../types";
import { ErrorHandler } from "../utils/error-handler";
import * as path from "path";
import * as fs from "fs";
import { GitHubService } from "../services/github.service";

export class PushCommand implements ICommand {
  constructor(
    private manifestService: ManifestService,
    private registryService: RegistryService,
    private infraService: InfraService,
    private gh: GitHubService,
    private handlers: Record<string, HandlerModule>,
  ) {}

  async execute() {
    let manifest: any;
    try {
      // 1. Load Manifest
      manifest = this.manifestService.load(CONFIG.PATHS.MANIFEST);
    } catch (e) {
      ErrorHandler.handle(e, this.handlers);
      return; // Stop execution
    }

    const { metadata, ...sections } = manifest;
    console.log(chalk.blue(`🚀 Pushing ${metadata.name}...`));

    // ... (Context creation same as before)
    const filesQueue: { path: string; content: string }[] = [];
    const context: PushContext = {
      serviceSlug: metadata.slug,
      async readFile(p) {
        const fullPath = path.resolve(p);
        if (!fs.existsSync(fullPath))
          throw new Error(`File not found: ${fullPath}`);
        return fs.readFileSync(fullPath, "utf8");
      },
      uploadFile(p, c) {
        filesQueue.push({ path: p, content: c });
      },
    };

    // 3. Fetch Registry
    await this.registryService.fetch();
    const interfacesData: any = {};

    // 4. Process Handlers
    for (const [key, config] of Object.entries(sections)) {
      if (key === "version") continue;

      const handler = this.handlers[key];
      if (handler) {
        console.log(`Processing ${key}...`);
        try {
          const result = await handler.push(context, config);

          interfacesData[key] = result.registryData;
          if (result.appConfig) {
            this.infraService.add(result.appConfig);
          }
        } catch (err: any) {
          console.error(chalk.red(`❌ Error processing ${key}:`), err.message);
          process.exit(1);
        }
      }
    }

    // ... (Finalize & Commit same as before)
    this.registryService.updateService(metadata.slug, metadata, interfacesData);
    filesQueue.push(this.registryService.getArtifact());
    filesQueue.push(this.infraService.createArtifact(metadata));

    try {
      const sha = await this.gh.createAtomicCommit(
        filesQueue,
        `chore(registry): update ${metadata.slug}`,
      );
      console.log(chalk.green(`✅ Success! Commit: ${sha}`));
    } catch (e: any) {
      console.error(chalk.red("❌ Failed:"), e.message);
      process.exit(1);
    }
  }
}
