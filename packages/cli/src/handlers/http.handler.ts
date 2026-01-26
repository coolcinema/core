import * as path from "path";
import { z } from "zod";
import { BaseHandler } from "./base.handler";
import { PushContext, HandlerResult } from "../types";
import { CONFIG } from "../config";

const HttpInterfaceSchema = z
  .object({
    port: z.number(),
    spec: z.string().optional(),
  })
  .strict();

const HttpSectionSchema = z.record(z.string(), HttpInterfaceSchema);

type HttpItem = z.infer<typeof HttpInterfaceSchema>;

export class HttpHandler extends BaseHandler<HttpItem> {
  schema = HttpSectionSchema;
  defaults = {
    api: {
      port: 3000,
      spec: "dist/openapi.yaml",
    },
  };

  protected async processItem(
    ctx: PushContext,
    key: string,
    item: HttpItem,
    result: HandlerResult,
  ) {
    let specPathRemote: string | undefined;

    if (item.spec) {
      const content = await ctx.readFile(item.spec);

      const ext = path.extname(item.spec);
      const fileName = `${ctx.serviceSlug}_${key}${ext}`;
      const remotePath = `${CONFIG.PATHS.CONTRACTS_ROOT}/schemas/${fileName}`;

      ctx.uploadFile(remotePath, content);

      specPathRemote = `schemas/${fileName}`;
    }

    result.registryData[key] = {
      port: item.port,
      spec: specPathRemote,
    };

    result.appConfig!.ports!.push({
      name: `http-${key}`,
      port: item.port,
      protocol: "TCP",
    });
  }
}
