import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import * as yaml from "js-yaml";
import { CONFIG } from "../config";
import { GitHubService } from "../utils/github";
import { RegistryManager } from "../utils/registry";
import { loadManifest } from "../manifest/validator";
import { handlers } from "../handlers";
import { PushContext } from "../types";
import { InfraBuilder } from "../infra/builder";

export const pushCommand = async () => {
  const gh = new GitHubService();
  const regManager = new RegistryManager(gh);

  const manifest: any = loadManifest(CONFIG.PATHS.MANIFEST);
  const { metadata, ...sections } = manifest;

  console.log(chalk.blue(`🚀 Pushing ${metadata.name}...`));

  const filesQueue: any[] = [];
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

  await regManager.fetch();
  const interfacesData: any = {};
  const infra = new InfraBuilder();

  for (const [key, config] of Object.entries(sections)) {
    if (key === "version") continue;

    if (handlers[key]) {
      console.log(`Processing ${key}...`);
      try {
        const result = await handlers[key].push(context, config);
        interfacesData[key] = result.registryData;
        if (result.appConfig) infra.add(result.appConfig);
      } catch (err: any) {
        console.error(chalk.red(`❌ Error processing ${key}:`), err.message);
        process.exit(1);
      }
    }
  }

  regManager.updateService(metadata.slug, metadata, interfacesData);
  filesQueue.push(regManager.getFile());

  // Генерируем Helm Values (YAML)
  const helmValues = infra.buildHelmValues(metadata);

  filesQueue.push({
    path: `${CONFIG.PATHS.APPS_DIR}/${metadata.slug}.yaml`, // Важно! YAML
    content: yaml.dump(helmValues),
  });

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
