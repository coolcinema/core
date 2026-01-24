import { GitHubService } from "./github";
import { CONFIG } from "../config";

export class RegistryManager {
  private data: any = { services: {} };

  constructor(private gh: GitHubService) {}

  async fetch() {
    const content = await this.gh.getFileContent(CONFIG.PATHS.REGISTRY_JSON);
    if (content) {
      this.data = JSON.parse(content);
    }
  }

  updateService(slug: string, metadata: any, interfaces: Record<string, any>) {
    this.data.services[slug] = {
      host: slug,
      ...metadata,
      ...interfaces, // grpc: {...}, http: {...}
    };
  }

  getFile() {
    return {
      path: CONFIG.PATHS.REGISTRY_JSON,
      content: JSON.stringify(this.data, null, 2),
    };
  }
}
