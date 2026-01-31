import * as path from "path";
import { z } from "zod";
import { BaseHandler } from "./base.handler";
import { PushContext, HandlerResult } from "../types";
import { CONFIG } from "../config";

const EventsInterfaceSchema = z
  .object({
    spec: z.string(),
  })
  .strict();

const EventsSectionSchema = z.record(z.string(), EventsInterfaceSchema);

type EventsItem = z.infer<typeof EventsInterfaceSchema>;

export class EventsHandler extends BaseHandler<EventsItem> {
  schema = EventsSectionSchema;

  defaults = {
    main: {
      spec: "src/contracts/events/events.proto",
    },
  };

  async push(ctx: PushContext, rawConfig: any): Promise<HandlerResult> {
    const config = rawConfig as Record<string, EventsItem>;
    const result: HandlerResult = {
      registryData: {},
      appConfig: { ports: [], ingress: [], env: {} },
    };

    console.log(`[DEBUG] EventsHandler keys:`, Object.keys(config));

    for (const [key, item] of Object.entries(config)) {
      const content = await ctx.readFile(item.spec);

      const ext = path.extname(item.spec);
      // Добавляем _events для уникальности
      const remoteFileName = `${ctx.serviceSlug}_events_${key}${ext}`;
      const remotePath = `${CONFIG.PATHS.CONTRACTS_ROOT}/events/${remoteFileName}`;

      ctx.uploadFile(remotePath, content);

      result.registryData[key] = {
        spec: `events/${remoteFileName}`,
        hasEvents: true,
      };
    }

    return result;
  }

  protected async processItem() {}
}
