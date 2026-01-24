import * as path from "path";
import { Handler } from "./index";
import { CONFIG } from "../config";

interface GrpcConfig {
  [key: string]: {
    files: string[];
    port: number;
  };
}

export const GrpcHandler: Handler = {
  async push(ctx, rawConfig: any) {
    const config = rawConfig as GrpcConfig;
    const registryData: any = {};
    const ports: Array<{ name: string; port: number; protocol: string }> = [];

    for (const [key, contract] of Object.entries(config)) {
      const uploadedFiles: string[] = [];

      // Validation
      if (!contract.files || !Array.isArray(contract.files)) {
        console.warn(`⚠️  Interface '${key}' missing 'files' array. Skipping.`);
        continue;
      }

      for (const filePath of contract.files) {
        // @ts-ignore
        const content = await ctx.readFile(filePath);

        const fileName = `${ctx.serviceSlug}_${path.basename(filePath)}`;
        const remotePath = `${CONFIG.PATHS.CONTRACTS_ROOT}/protos/${fileName}`;

        ctx.uploadFile(remotePath, content);
        uploadedFiles.push(`protos/${fileName}`);
      }

      registryData[key] = {
        files: uploadedFiles,
        port: contract.port,
      };

      if (contract.port) {
        ports.push({ name: "grpc", port: contract.port, protocol: "TCP" });
      }
    }

    return { registryData, expose: ports };
  },
};
