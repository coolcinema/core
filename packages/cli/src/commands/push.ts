import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import chalk from "chalk";
import { CONFIG } from "../config";
import { GitHubService } from "../utils/github";
import { RegistryManager } from "../utils/registry";
import { handlers, PushContext } from "../handlers";

export const pushCommand = async () => {
  // 1. Init Utils
  const gh = new GitHubService();
  const regManager = new RegistryManager(gh);

  // 2. Read Manifest
  if (!fs.existsSync(CONFIG.PATHS.MANIFEST)) {
    console.error(chalk.red("❌ Manifest not found"));
    process.exit(1);
  }
  const manifest = yaml.load(
    fs.readFileSync(CONFIG.PATHS.MANIFEST, "utf8"),
  ) as any;
  const { metadata, ...sections } = manifest;

  console.log(chalk.blue(`🚀 Pushing ${metadata.name}...`));

  // 3. Prepare Context
  const filesQueue: any[] = [];
  const context: PushContext = {
    serviceSlug: metadata.slug,
    async readFile(p) {
      return fs.readFileSync(path.resolve(p), "utf8");
    },
    uploadFile(p, c) {
      filesQueue.push({ path: p, content: c });
    },
  };

  // 4. Process Handlers
  await regManager.fetch();
  const interfacesData: any = {};

  for (const [key, config] of Object.entries(sections)) {
    if (key === "version") continue;
    if (handlers[key]) {
      console.log(`Processing ${key}...`);
      interfacesData[key] = await handlers[key].push(context, config);
    }
  }

  // 5. Update Registry & Commit
  regManager.updateService(metadata.slug, metadata, interfacesData);
  filesQueue.push(regManager.getFile());

  try {
    const sha = await gh.createAtomicCommit(
      filesQueue,
      `chore(registry): update ${metadata.slug}`,
    );
    console.log(chalk.green(`✅ Success! Commit: ${sha}`));
  } catch (e: any) {
    console.error(chalk.red("❌ Failed:"), e.message);
    process.exit(1);
  }
};
