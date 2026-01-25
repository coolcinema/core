import { z } from "zod";

export interface PushContext {
  serviceSlug: string;
  readFile(path: string): Promise<string>;
  uploadFile(remotePath: string, content: string): void;
}

export interface HandlerResult {
  registryData: any;
  expose?: Array<{ port: number; name: string; protocol: string }>;
}

export interface HandlerModule {
  push(ctx: PushContext, config: any): Promise<HandlerResult>;
  schema: z.ZodTypeAny;
  defaults?: any;
}
