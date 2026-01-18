import { AsyncLocalStorage } from "async_hooks";

export interface AppContext {
  traceId?: string;
  routingHeaders: Record<string, string | string[]>;

  userId?: string;
}

export const contextStorage = new AsyncLocalStorage<AppContext>();

export const runInContext = <T>(ctx: AppContext, fn: () => T): T => {
  return contextStorage.run(ctx, fn);
};

export const getCurrentContext = (): AppContext | undefined => {
  return contextStorage.getStore();
};
