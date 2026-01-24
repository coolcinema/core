import { Handler } from "./index";
import { CONFIG } from "../config";

interface GrpcConfig {
  [key: string]: {
    proto: string;
    port: number;
  };
}

export const GrpcHandler: Handler = {
  async push(ctx, rawConfig: any) {
    const config = rawConfig as GrpcConfig;
    const registryData: any = {};
    const ports: Array<{ name: string; port: number; protocol: string }> = [];

    for (const [key, contract] of Object.entries(config)) {
      const content = await ctx.readFile(contract.proto);

      const fileName = `${ctx.serviceSlug}_${key}.proto`;
      const remotePath = `${CONFIG.PATHS.CONTRACTS_ROOT}/protos/${fileName}`;

      ctx.uploadFile(remotePath, content);

      registryData[key] = {
        files: [`protos/${fileName}`],
        port: contract.port,
      };

      if (contract.port) {
        ports.push({ name: "grpc", port: contract.port, protocol: "TCP" });
      }
    }

    return { registryData, expose: ports };
  },
};
