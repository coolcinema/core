import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import chalk from "chalk";
import { Octokit } from "@octokit/rest";
import { Platform, PushContext, PortDefinition } from "@coolcinema/platform";

interface Manifest {
  metadata: {
    name: string;
    slug: string;
    description: string;
    ports?: PortDefinition[]; // <-- Новое поле в манифесте (генерируется CLI)
  };
  interfaces: Record<string, any>;
}

export const pushCommand = async () => {
  const token = process.env.COOLCINEMA_GH_PKG_TOKEN;
  if (!token) {
    console.error(chalk.red("❌ Missing COOLCINEMA_GH_PKG_TOKEN"));
    process.exit(1);
  }

  const octokit = new Octokit({ auth: token });
  const OWNER = "coolcinema";
  const REPO = "core";
  const BRANCH = "main";

  const manifestPath = path.join(process.cwd(), "coolcinema.yaml");
  if (!fs.existsSync(manifestPath)) {
    console.error(chalk.red("❌ coolcinema.yaml not found."));
    process.exit(1);
  }
  const manifest = yaml.load(fs.readFileSync(manifestPath, "utf8")) as Manifest;
  const { metadata, interfaces } = manifest;

  console.log(
    chalk.blue(`🚀 Pushing service: ${metadata.name} (${metadata.slug})...`),
  );

  const filesToUpload: Array<{ path: string; content: string }> = [];

  const context: PushContext = {
    serviceSlug: metadata.slug,

    async readLocalFile(localPath: string) {
      const fullPath = path.resolve(process.cwd(), localPath);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${localPath}`);
      }
      return fs.readFileSync(fullPath, "utf8");
    },

    addFile(remotePath: string, content: string) {
      filesToUpload.push({ path: remotePath, content });
    },
  };

  // Инициализируем metadata с пустым массивом портов
  const catalogData: any = {
    metadata: { ...metadata, ports: [] },
    interfaces: {},
  };

  const allPorts: PortDefinition[] = [];

  for (const [moduleId, config] of Object.entries(interfaces)) {
    const module = Platform.get(moduleId);

    if (!module) {
      console.warn(
        chalk.yellow(`⚠️  Unknown interface type: ${moduleId}. Skipping.`),
      );
      continue;
    }

    console.log(`Processing ${moduleId}...`);

    const parseResult = module.schema.safeParse(config);
    if (!parseResult.success) {
      console.error(chalk.red(`❌ Invalid configuration for ${moduleId}:`));
      console.error(parseResult.error.issues);
      process.exit(1);
    }

    // Получаем результат (registryData + ports)
    // ВАЖНО: PlatformModule.onPush теперь возвращает { registryData, ports }
    const { registryData, ports } = await module.onPush(
      context,
      parseResult.data,
    );

    catalogData.interfaces[moduleId] = registryData;

    if (ports && Array.isArray(ports)) {
      allPorts.push(...ports);
    }
  }

  // Убираем дубликаты портов (по номеру порта)
  const uniquePorts = Array.from(
    new Map(allPorts.map((p) => [p.port, p])).values(),
  );
  catalogData.metadata.ports = uniquePorts;

  const serviceBasePath = `packages/catalog/services/${metadata.slug}`;
  filesToUpload.push({
    path: "manifest.json",
    content: JSON.stringify(catalogData, null, 2),
  });

  try {
    const { data: ref } = await octokit.git.getRef({
      owner: OWNER,
      repo: REPO,
      ref: `heads/${BRANCH}`,
    });
    const latestCommitSha = ref.object.sha;

    const { data: commit } = await octokit.git.getCommit({
      owner: OWNER,
      repo: REPO,
      commit_sha: latestCommitSha,
    });
    const baseTreeSha = commit.tree.sha;

    const treeItems = [];
    for (const file of filesToUpload) {
      const fullPath = `${serviceBasePath}/${file.path}`;

      const { data: blob } = await octokit.git.createBlob({
        owner: OWNER,
        repo: REPO,
        content: file.content,
        encoding: "utf-8",
      });

      treeItems.push({
        path: fullPath,
        mode: "100644",
        type: "blob",
        sha: blob.sha,
      });
    }

    const { data: newTree } = await octokit.git.createTree({
      owner: OWNER,
      repo: REPO,
      base_tree: baseTreeSha,
      tree: treeItems as any,
    });

    const { data: newCommit } = await octokit.git.createCommit({
      owner: OWNER,
      repo: REPO,
      message: `chore(catalog): update ${metadata.slug}`,
      tree: newTree.sha,
      parents: [latestCommitSha],
    });

    await octokit.git.updateRef({
      owner: OWNER,
      repo: REPO,
      ref: `heads/${BRANCH}`,
      sha: newCommit.sha,
    });

    console.log(
      chalk.green(
        `✅ Successfully pushed ${treeItems.length} files in one commit!`,
      ),
    );
    console.log(chalk.dim(`Commit: ${newCommit.sha}`));
  } catch (e: any) {
    console.error(chalk.red("❌ Failed to create atomic commit:"));
    console.error(e.message);
    process.exit(1);
  }
};
