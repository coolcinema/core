import * as path from "path";
import { z } from "zod";
import { CONFIG } from "../config";
import { HandlerModule } from "../types";

const GrpcInterfaceSchema = z
  .object({
    files: z.array(z.string()),
    port: z.number(),
  })
  .strict();

const GrpcSectionSchema = z.record(z.string(), GrpcInterfaceSchema);

const defaults = {
  main: {
    files: ["src/proto/service.proto"],
    port: 5000,
  },
};

export const GrpcHandler: HandlerModule = {
  schema: GrpcSectionSchema,
  defaults,

  async push(ctx, rawConfig) {
    const config = rawConfig as z.infer<typeof GrpcSectionSchema>;
    const registryData: any = {};
    const ports: any[] = [];

    console.log("[DEBUG] GrpcHandler processing keys:", Object.keys(config));

    for (const [key, contract] of Object.entries(config)) {
      const uploadedFiles: string[] = [];

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

      ports.push({ name: "grpc", port: contract.port, protocol: "TCP" });
    }

    return {
      registryData,
      appConfig: {
        ports: ports, // Теперь это часть appConfig
      },
    };
  },
};
