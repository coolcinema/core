import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { Octokit } from "@octokit/rest";
import * as dotenv from "dotenv";
import { ServiceManifest } from "../types";

dotenv.config();

export const pushCommand = async () => {
  const manifestPath = path.join(process.cwd(), "coolcinema.yaml");

  if (!fs.existsSync(manifestPath)) {
    console.error(
      '❌ coolcinema.yaml not found. Run "coolcinema service init" first.',
    );
    process.exit(1);
  }

  const manifest = yaml.load(
    fs.readFileSync(manifestPath, "utf8"),
  ) as ServiceManifest;

  if (!process.env.COOLCINEMA_GH_PKG_TOKEN) {
    console.error("❌ COOLCINEMA_GH_PKG_TOKEN is missing in .env");
    process.exit(1);
  }

  const octokit = new Octokit({ auth: process.env.COOLCINEMA_GH_PKG_TOKEN });
  const owner = "coolcinema"; // ЗАМЕНИТЕ НА ВАШУ ОРГАНИЗАЦИЮ ИЛИ ЮЗЕРА ЕСЛИ НУЖНО
  const repo = "core";

  console.log(`🚀 Syncing service "${manifest.service.name}" to Core...`);

  // 1. Sync Registry Definition (JSON)
  const registryPath = `packages/registry/definitions/${manifest.service.name.toLowerCase()}.json`;
  const registryContent = JSON.stringify(
    {
      name: manifest.service.name,
      slug: manifest.service.slug,
      description: manifest.service.description,
      port: manifest.service.port,
    },
    null,
    2,
  );

  try {
    // Получаем SHA файла, если он существует (для обновления)
    let sha: string | undefined;
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: registryPath,
      });
      if (!Array.isArray(data)) {
        sha = data.sha;
      }
    } catch (e) {
      // Файл не существует, это нормально
    }

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: registryPath,
      message: `feat(registry): update ${manifest.service.name} definition`,
      content: Buffer.from(registryContent).toString("base64"),
      sha,
    });
    console.log("✅ Registry definition updated.");
  } catch (error: any) {
    console.error(
      "❌ Failed to update registry:",
      error.response?.data?.message || error.message,
    );
  }

  // 2. Sync Contracts (Proto)
  if (manifest.contracts?.proto) {
    const localProtoPath = path.join(process.cwd(), manifest.contracts.proto);
    if (fs.existsSync(localProtoPath)) {
      const protoContent = fs.readFileSync(localProtoPath);
      const remoteProtoPath = `packages/contracts/protos/${manifest.service.name.toLowerCase()}.proto`;

      try {
        let sha: string | undefined;
        try {
          const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path: remoteProtoPath,
          });
          if (!Array.isArray(data)) {
            sha = data.sha;
          }
        } catch (e) {}

        await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: remoteProtoPath,
          message: `feat(contracts): update ${manifest.service.name} proto`,
          content: protoContent.toString("base64"),
          sha,
        });
        console.log("✅ Contract proto updated.");
      } catch (error: any) {
        console.error(
          "❌ Failed to update contract:",
          error.response?.data?.message || error.message,
        );
      }
    } else {
      console.warn(`⚠️ Proto file not found at ${localProtoPath}`);
    }
  }
};
