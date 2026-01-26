import { z } from "zod";
import { HandlerModule, HandlerResult, PushContext } from "../types";

export abstract class BaseHandler<TItem> implements HandlerModule {
  abstract schema: z.ZodTypeAny;
  abstract defaults?: any;

  async push(ctx: PushContext, rawConfig: any): Promise<HandlerResult> {
    const config = rawConfig as Record<string, TItem>;

    const result: HandlerResult = {
      registryData: {},
      appConfig: { ports: [], ingress: [], env: {} }, // Инициализируем пустыми
    };

    console.log(
      `[DEBUG] ${this.constructor.name} processing keys:`,
      Object.keys(config),
    );

    for (const [key, item] of Object.entries(config)) {
      await this.processItem(ctx, key, item, result);
    }

    return result;
  }

  protected abstract processItem(
    ctx: PushContext,
    key: string,
    item: TItem,
    result: HandlerResult,
  ): Promise<void>;
}
