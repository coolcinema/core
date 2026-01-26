import * as path from "path";
import { z } from "zod";
import { BaseHandler } from "./base.handler";
import { PushContext, HandlerResult } from "../types";
import { CONFIG } from "../config";

const GrpcInterfaceSchema = z
  .object({
    files: z.array(z.string()),
    port: z.number(),
  })
  .strict();

const GrpcSectionSchema = z.record(z.string(), GrpcInterfaceSchema);

type GrpcItem = z.infer<typeof GrpcInterfaceSchema>;

export class GrpcHandler extends BaseHandler<GrpcItem> {
  schema = GrpcSectionSchema;
  defaults = {
    main: {
      files: ["src/proto/service.proto"],
      port: 5000,
    },
  };

  protected async processItem(
    ctx: PushContext,
    key: string,
    item: GrpcItem,
    result: HandlerResult,
  ) {
    const uploadedFiles: string[] = [];

    for (const filePath of item.files) {
      const content = await ctx.readFile(filePath);
      const fileName = `${ctx.serviceSlug}_${path.basename(filePath)}`;
      const remotePath = `${CONFIG.PATHS.CONTRACTS_ROOT}/protos/${fileName}`;

      ctx.uploadFile(remotePath, content);
      uploadedFiles.push(`protos/${fileName}`);
    }

    result.registryData[key] = {
      files: uploadedFiles,
      port: item.port,
    };

    result.appConfig!.ports!.push({
      name: "grpc",
      port: item.port,
      protocol: "TCP",
    });
  }
}
