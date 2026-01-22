import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import chalk from "chalk";
import { Octokit } from "@octokit/rest";
import { ServiceManifest } from "../types";

export const pushCommand = async () => {
  // 1. Validation
  const manifestPath = path.join(process.cwd(), "coolcinema.yaml");
  if (!fs.existsSync(manifestPath)) {
    console.error(
      chalk.red(
        '❌ coolcinema.yaml not found. Run "coolcinema service init" first.',
      ),
    );
    process.exit(1);
  }

  // 2. Read Manifest
  const fileContent = fs.readFileSync(manifestPath, "utf8");
  const manifest = yaml.load(fileContent) as ServiceManifest;
  const { service } = manifest;

  console.log(
    chalk.blue(`🚀 Pushing service: ${service.name} (${service.slug})...`),
  );

  // 3. Auth
  const token = process.env.COOLCINEMA_GH_PKG_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) {
    console.error(
      chalk.red("❌ Missing COOLCINEMA_GH_PKG_TOKEN env variable."),
    );
    process.exit(1);
  }

  const octokit = new Octokit({ auth: token });

  // Settings (Hardcoded for now, can be moved to config later)
  const OWNER = "coolcinema";
  const REPO = "core";
  const BRANCH = "main"; // Или feature-branch, если работаем через PR

  // 4. Prepare Registry Content
  // Формат должен совпадать с тем, что ожидает registry/scripts/build.ts
  const registryData = {
    name: service.name,
    slug: service.slug,
    port: service.port,
    description: service.description,
  };

  const registryContent = JSON.stringify(registryData, null, 2);

  // Используем поле repository для имени файла
  const registryPath = `packages/registry/definitions/${service.repository}.json`;

  try {
    // 5. Check if file exists to get SHA (needed for update)
    let sha: string | undefined;
    try {
      const { data } = await octokit.repos.getContent({
        owner: OWNER,
        repo: REPO,
        path: registryPath,
        ref: BRANCH,
      });
      if ("sha" in data) {
        sha = data.sha;
      }
    } catch (e) {
      // File doesn't exist - ignore error
    }

    // 6. Create or Update
    await octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path: registryPath,
      message: `feat(registry): update ${service.name} configuration`,
      content: Buffer.from(registryContent).toString("base64"),
      branch: BRANCH,
      sha: sha, // Undefined if creating new file
    });

    console.log(chalk.green(`\n✅ Successfully pushed to Registry!`));
    console.log(chalk.dim(`Path: ${OWNER}/${REPO}/${registryPath}`));
    console.log(
      chalk.yellow(
        `\n⏳ CI/CD in 'core' repo will now rebuild @coolcinema/registry package.`,
      ),
    );
  } catch (error: any) {
    console.error(chalk.red("\n❌ Failed to push to GitHub:"));
    console.error(error.response?.data?.message || error.message);
    process.exit(1);
  }
};
