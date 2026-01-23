import { PlatformModule } from "./types";
import { GrpcModule } from "./modules/grpc";

export class PlatformRegistry {
  private modules: Map<string, PlatformModule> = new Map();

  constructor() {
    this.register(GrpcModule);
  }

  register(mod: PlatformModule) {
    this.modules.set(mod.id, mod);
  }

  get(id: string) {
    return this.modules.get(id);
  }

  getAll() {
    return Array.from(this.modules.values());
  }
}

export const Platform = new PlatformRegistry();
export * from "./types";
