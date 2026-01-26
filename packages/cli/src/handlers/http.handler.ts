import * as path from "path";
import { z } from "zod";
import { BaseHandler } from "./base.handler";
import { PushContext, HandlerResult } from "../types";
import { CONFIG } from "../config";

const HttpInterfaceSchema = z
  .object({
    port: z.number(),
    spec: z.string().optional(), // Путь к OpenAPI файлу (yaml/json)
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

    // 1. Upload Spec (если есть)
    if (item.spec) {
      // @ts-ignore
      const content = await ctx.readFile(item.spec);

      const ext = path.extname(item.spec);
      const fileName = `${ctx.serviceSlug}_${key}${ext}`; // identity-service_api.yaml
      const remotePath = `${CONFIG.PATHS.CONTRACTS_ROOT}/schemas/${fileName}`;

      ctx.uploadFile(remotePath, content);

      // Путь относительно корня пакета contracts (для использования в npm)
      specPathRemote = `schemas/${fileName}`;
    }

    // 2. Registry Data
    result.registryData[key] = {
      port: item.port,
      spec: specPathRemote,
    };

    // 3. App Config (открываем порт в Service)
    result.appConfig!.ports!.push({
      name: `http-${key}`,
      port: item.port,
      protocol: "TCP",
    });
  }
}
