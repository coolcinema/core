import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import chalk from "chalk";
import { Octokit } from "@octokit/rest";
import { Platform, PushContext } from "@coolcinema/platform";

// Интерфейс манифеста (должен совпадать с тем, что генерирует init)
interface Manifest {
  metadata: {
    name: string;
    slug: string;
    description: string;
  };
  interfaces: Record<string, any>;
}

export const pushCommand = async () => {
  // 1. Setup & Auth
  const token = process.env.COOLCINEMA_GH_PKG_TOKEN;
  if (!token) {
    console.error(chalk.red("❌ Missing COOLCINEMA_GH_PKG_TOKEN"));
    process.exit(1);
  }

  const octokit = new Octokit({ auth: token });
  const OWNER = "coolcinema";
  const REPO = "core";
  const BRANCH = "main";

  // 2. Read Manifest
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

  // 3. Prepare Files (In Memory)
  const filesToUpload: Array<{ path: string; content: string }> = [];

  const context: PushContext = {
    serviceSlug: metadata.slug,

    async readLocalFile(localPath: string) {
      const fullPath = path.resolve(process.cwd(), localPath);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${localPath}`);
      }
      return fs.readFileSync(fullPath, "utf8"); // Читаем как utf8, не base64 (createBlob закодирует)
    },

    addFile(remotePath: string, content: string) {
      filesToUpload.push({ path: remotePath, content });
    },
  };

  // Сохраняем структуру: metadata + interfaces
  const catalogData: any = { metadata, interfaces: {} };

  // 4. Process Modules
  for (const [moduleId, config] of Object.entries(interfaces)) {
    const module = Platform.get(moduleId);

    if (!module) {
      console.warn(
        chalk.yellow(`⚠️  Unknown interface type: ${moduleId}. Skipping.`),
      );
      continue;
    }

    console.log(`Processing ${moduleId}...`);

    // A. Валидация (Zod)
    const parseResult = module.schema.safeParse(config);
    if (!parseResult.success) {
      console.error(chalk.red(`❌ Invalid configuration for ${moduleId}:`));
      console.error(parseResult.error.issues);
      process.exit(1);
    }

    // B. Запуск логики модуля
    const moduleRegistryData = await module.onPush(context, parseResult.data);
    catalogData.interfaces[moduleId] = moduleRegistryData;
  }

  // 5. Add Manifest
  const serviceBasePath = `packages/catalog/services/${metadata.slug}`;
  filesToUpload.push({
    path: "manifest.json",
    content: JSON.stringify(catalogData, null, 2),
  });

  // 6. ATOMIC COMMIT via Git Data API
  try {
    // A. Get current ref
    const { data: ref } = await octokit.git.getRef({
      owner: OWNER,
      repo: REPO,
      ref: `heads/${BRANCH}`,
    });
    const latestCommitSha = ref.object.sha;

    // B. Get latest commit tree
    const { data: commit } = await octokit.git.getCommit({
      owner: OWNER,
      repo: REPO,
      commit_sha: latestCommitSha,
    });
    const baseTreeSha = commit.tree.sha;

    // C. Create blobs and tree items
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
        mode: "100644", // file
        type: "blob",
        sha: blob.sha,
      });
    }

    // D. Create new tree
    const { data: newTree } = await octokit.git.createTree({
      owner: OWNER,
      repo: REPO,
      base_tree: baseTreeSha,
      tree: treeItems as any,
    });

    // E. Create commit
    const { data: newCommit } = await octokit.git.createCommit({
      owner: OWNER,
      repo: REPO,
      message: `chore(catalog): update ${metadata.slug}`, // Можно убрать skip ci
      tree: newTree.sha,
      parents: [latestCommitSha],
    });

    // F. Update ref (Force push logic effectively)
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
