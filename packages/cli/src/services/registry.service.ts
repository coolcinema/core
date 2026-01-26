import { CONFIG } from "../config";
import { GitHubService } from "./github.service";

export class RegistryService {
  private data: any = { services: {} };

  constructor(private gh: GitHubService) {}

  async fetch() {
    const content = await this.gh.getFileContent(CONFIG.PATHS.REGISTRY_JSON);
    if (content) {
      this.data = JSON.parse(content);
    }
  }

  getServices(): Record<string, any> {
    return this.data.services || {};
  }

  updateService(slug: string, metadata: any, interfaces: Record<string, any>) {
    this.data.services[slug] = {
      host: slug,
      ...metadata,
      ...interfaces,
    };
  }
  loadFromLocal() {
    try {
      // Пытаемся найти пакет contracts
      // Путь может отличаться в зависимости от структуры проекта, но require найдет его
      // @ts-ignore
      const localRegistry = require("@coolcinema/contracts/dist/registry.json");
      this.data = { services: localRegistry.services };
    } catch (e) {
      console.warn(
        "⚠️  Could not load local registry. Make sure @coolcinema/contracts is installed.",
      );
    }
  }

  getArtifact() {
    return {
      path: CONFIG.PATHS.REGISTRY_JSON,
      content: JSON.stringify(this.data, null, 2),
    };
  }
}
