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

  // 3. Реализация PushContext
  // Этот объект передается в модули, чтобы они могли читать и отправлять файлы
  // не зная про Octokit и файловую систему напрямую.
  const context: PushContext = {
    serviceSlug: metadata.slug,

    async readLocalFile(localPath: string) {
      const fullPath = path.resolve(process.cwd(), localPath);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${localPath}`);
      }
      return fs.readFileSync(fullPath).toString("base64"); // GitHub API требует base64 для бинарных/текстовых файлов
    },

    addFile(remotePath: string, content: string) {
      // Пока просто складываем в очередь, отправим в конце
      filesQueue.push({ path: remotePath, content });
    },
  };

  const filesQueue: Array<{ path: string; content: string }> = [];
  const catalogData: any = { ...metadata, interfaces: {} };

  // 4. Обработка модулей
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
    // Модуль читает файлы через ctx.readLocalFile и добавляет их в ctx.addFile
    // Возвращает объект для manifest.json
    const moduleRegistryData = await module.onPush(context, parseResult.data);

    catalogData.interfaces[moduleId] = moduleRegistryData;
  }

  // 5. Отправка файлов (Batch)
  // Мы отправляем файлы в `packages/catalog/services/<slug>/`
  const serviceBasePath = `packages/catalog/services/${metadata.slug}`;

  // 5.1 Добавляем сам manifest.json в очередь
  filesQueue.push({
    path: "manifest.json",
    content: Buffer.from(JSON.stringify(catalogData, null, 2)).toString(
      "base64",
    ),
  });

  // 5.2 Заливаем все файлы
  // В идеале это должен быть один Git Commit (через GraphQL API),
  // но для простоты используем REST (по одному файлу).

  for (const file of filesQueue) {
    const remotePath = `${serviceBasePath}/${file.path}`;
    const message = `chore(catalog): update ${file.path} for ${metadata.slug}`;

    await createOrUpdateFile(
      octokit,
      OWNER,
      REPO,
      remotePath,
      file.content,
      message,
      BRANCH,
    );
    console.log(chalk.green(`✅ Uploaded: ${remotePath}`));
  }

  console.log(
    chalk.blue(`
🏁 Service registered successfully!`),
  );
};

// Helper для GitHub API
async function createOrUpdateFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch: string,
) {
  let sha: string | undefined;
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });
    if (!Array.isArray(data) && "sha" in data) {
      sha = data.sha;
    }
  } catch (e) {
    // File not found, create new
  }

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content,
    branch,
    sha,
  });
}
