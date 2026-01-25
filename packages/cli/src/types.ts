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

export interface IngressRule {
  name: string;
  port: number;
  host?: string;
  path?: string;
}

export interface AppConfig {
  ports?: Array<{ port: number; name: string; protocol: string }>;
  ingress?: Array<IngressRule>;
  env?: Record<string, string>;
}

export interface HandlerResult {
  registryData: any; // Данные для registry.json
  appConfig?: AppConfig; // Данные для инфраструктуры (ArgoCD)
}

export interface HandlerModule {
  push(ctx: PushContext, config: any): Promise<HandlerResult>;
  schema: z.ZodTypeAny;
  defaults?: any;
}
