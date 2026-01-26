import { AppConfig } from "../types";
import { CONFIG } from "../config";

export class InfraService {
  private config: AppConfig = {
    ports: [],
    ingress: [],
    env: {},
  };

  add(partial: AppConfig) {
    if (partial.ports) this.config.ports?.push(...partial.ports);
    if (partial.ingress) this.config.ingress?.push(...partial.ingress);
    if (partial.env) Object.assign(this.config.env!, partial.env);
  }

  createArtifact(metadata: any): { path: string; content: string } {
    const uniquePorts =
      this.config.ports?.filter(
        (port, index, self) =>
          index === self.findIndex((p) => p.port === port.port),
      ) || [];

    const values = {
      fullnameOverride: metadata.slug,
      image: {
        repository: `ghcr.io/coolcinema/${metadata.slug}`,
      },
      service: {
        ports: uniquePorts,
      },
      ingress: this.config.ingress || [],
      env: this.config.env,
    };

    return {
      path: `${CONFIG.PATHS.APPS_DIR}/${metadata.slug}${CONFIG.PATHS.APP_EXT}`,
      content: JSON.stringify(values, null, 2),
    };
  }
}
