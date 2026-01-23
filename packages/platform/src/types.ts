import { z } from "zod";
import { SourceFile } from "ts-morph";

export interface PushContext {
  serviceSlug: string;

  readLocalFile(path: string): Promise<string>;

  addFile(remotePath: string, content: string): void;
}

export interface CompileContext {
  serviceName: string;
  serviceDir: string;
  outDir: string;
}

// --- Новые типы для портов ---

export interface PortDefinition {
  name: string; // 'grpc', 'http'
  port: number;
  protocol?: "TCP" | "UDP";
}

export interface PushResult<TRegistry = any> {
  registryData: TRegistry;
  ports: PortDefinition[];
}

// --- Обновленный интерфейс модуля ---

export interface PlatformModule<TConfig = any, TRegistry = any> {
  id: string;

  schema: z.ZodType<TConfig, z.ZodTypeDef, any>;

  getTemplate(): TConfig;

  // Теперь возвращает не просто TRegistry, а PushResult (данные + порты)
  onPush(ctx: PushContext, config: TConfig): Promise<PushResult<TRegistry>>;

  onCompile(ctx: CompileContext, registryConfig: TRegistry): Promise<string[]>;

  generateApiCode(
    serviceName: string,
    serviceSlug: string,
    registryConfig: TRegistry,
    serviceFile: SourceFile,
  ): void;
}
