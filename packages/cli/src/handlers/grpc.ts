import * as path from "path";
import { CONFIG } from "../config";
import { Handler } from "../types";

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

    console.log(
      "[DEBUG] GrpcHandler started. Config keys:",
      Object.keys(config),
    );

    for (const [key, contract] of Object.entries(config)) {
      const uploadedFiles: string[] = [];

      if (!contract.files || !Array.isArray(contract.files)) {
        console.warn(`⚠️  Skipping interface '${key}': missing 'files' array.`);
        continue;
      }

      for (const filePath of contract.files) {
        console.log(`[DEBUG] Reading file: ${filePath}`);
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
