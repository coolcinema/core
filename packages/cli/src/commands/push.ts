import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import chalk from "chalk";
import { CONFIG } from "../config";
import { GitHubService } from "../utils/github";
import { RegistryManager } from "../utils/registry";
import { handlers, PushContext } from "../handlers";

interface Manifest {
  metadata: {
    name: string;
    slug: string;
    description: string;
  };
  [key: string]: any;
}

export const pushCommand = async () => {
  const gh = new GitHubService();
  const regManager = new RegistryManager(gh);

  if (!fs.existsSync(CONFIG.PATHS.MANIFEST)) {
    console.error(chalk.red("❌ Manifest not found"));
    process.exit(1);
  }
  const manifest = yaml.load(
    fs.readFileSync(CONFIG.PATHS.MANIFEST, "utf8"),
  ) as Manifest;
  const { metadata, ...sections } = manifest;

  console.log(chalk.blue(`🚀 Pushing ${metadata.name}...`));

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

  await regManager.fetch();
  const interfacesData: any = {};
  const allPorts: any[] = [];

  for (const [key, config] of Object.entries(sections)) {
    if (key === "version") continue;
    if (handlers[key]) {
      console.log(`Processing ${key}...`);
      const result = await handlers[key].push(context, config);

      interfacesData[key] = result.registryData;
      if (result.expose) allPorts.push(...result.expose);
    }
  }

  regManager.updateService(metadata.slug, metadata, interfacesData);
  filesQueue.push(regManager.getFile());

  // --- Создаем конфиг для ArgoCD ---
  const appConfig = {
    metadata: {
      name: metadata.name,
      slug: metadata.slug,
      // Дедупликация портов
      // @ts-ignore
      ports: [...new Map(allPorts.map((p) => [p.port, p])).values()],
    },
  };

  filesQueue.push({
    path: `${CONFIG.PATHS.APPS_DIR}/${metadata.slug}.json`,
    content: JSON.stringify(appConfig, null, 2),
  });
  // --------------------------------

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
