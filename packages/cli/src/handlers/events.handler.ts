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

type EventsItem = z.infer<typeof EventsInterfaceSchema>;

export class EventsHandler extends BaseHandler<EventsItem> {
  schema = EventsInterfaceSchema;

  defaults = {
    spec: "src/contracts/events/asyncapi.yaml",
  };

  async push(ctx: PushContext, rawConfig: any): Promise<HandlerResult> {
    const config = rawConfig as EventsItem;
    const result: HandlerResult = {
      registryData: {},
      appConfig: { ports: [], ingress: [], env: {} },
    };

    console.log(`[DEBUG] EventsHandler processing spec:`, config.spec);

    const content = await ctx.readFile(config.spec);

    const remoteFileName = `${ctx.serviceSlug}.yaml`;
    const remotePath = `${CONFIG.PATHS.CONTRACTS_ROOT}/events/${remoteFileName}`;

    ctx.uploadFile(remotePath, content);

    result.registryData = {
      spec: `events/${remoteFileName}`,
      hasEvents: true,
    };

    return result;
  }

  protected async processItem() {}
}
