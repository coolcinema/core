import { z } from "zod";
import { BaseHandler } from "./base.handler";
import { PushContext, HandlerResult } from "../types";

const IngressRuleSchema = z
  .object({
    port: z.number(),
    host: z.string().optional(),
    path: z.string().default("/"),
  })
  .strict();

const IngressSectionSchema = z.record(z.string(), IngressRuleSchema);

type IngressItem = z.infer<typeof IngressRuleSchema>;

export class IngressHandler extends BaseHandler<IngressItem> {
  schema = IngressSectionSchema;
  defaults = {
    main: {
      port: 3000,
      path: "/",
    },
  };

  protected async processItem(
    ctx: PushContext,
    key: string,
    item: IngressItem,
    result: HandlerResult,
  ) {
    const prefix = key === "main" ? "" : `${key}.`;
    const host = item.host || `${prefix}${ctx.serviceSlug}.coolcinema.local`;

    result.appConfig!.ingress!.push({
      name: key,
      port: item.port,
      host: host,
      path: item.path,
    });

    result.appConfig!.ports!.push({
      name: `http-${key}`,
      port: item.port,
      protocol: "TCP",
    });

    result.registryData[key] = item;
  }
}
