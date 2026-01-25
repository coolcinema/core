import { AppConfig } from "../types";

export class InfraBuilder {
  private config: AppConfig = {
    ports: [],
    ingress: [],
    env: {},
  };

  add(partial: AppConfig) {
    if (partial.ports) {
      this.config.ports?.push(...partial.ports);
    }
    if (partial.ingress) {
      this.config.ingress?.push(...partial.ingress);
    }
    if (partial.env) {
      Object.assign(this.config.env!, partial.env);
    }
  }

  build(metadata: any) {
    const uniquePorts = [
      ...new Map(this.config.ports?.map((p) => [p.port, p])).values(),
    ];

    return {
      metadata: {
        name: metadata.name,
        slug: metadata.slug,
        ports: uniquePorts,
        ingress: this.config.ingress,
      },
    };
  }
}
