import { z } from "zod";
import { SourceFile } from "ts-morph";

/**
 * Контекст для операции Push (выполняется в CLI).
 * Предоставляет доступ к файловой системе и абстракцию загрузки.
 */
export interface PushContext {
  serviceSlug: string;

  // Читает файл с диска разработчика (возвращает контент как строку/Buffer)
  readLocalFile(path: string): Promise<string>;

  // Добавляет файл в список на отправку в Core Catalog
  // remotePath: путь внутри папки сервиса (например, "api/auth.proto")
  addFile(remotePath: string, content: string): void;
}

/**
 * Контекст для операции Compile (выполняется в CI).
 * Предоставляет доступ к путям файловой системы для генерации кода.
 */
export interface CompileContext {
  serviceName: string;
  serviceDir: string; // Абсолютный путь к папке сервиса в Catalog
  outDir: string; // Куда складывать сгенерированные файлы
}

/**
 * Интерфейс модуля платформы.
 * TConfig - тип конфигурации в манифесте (валидируется Zod).
 * TRegistry - тип данных, которые модуль сохранит в manifest.json в каталоге.
 */
export interface PlatformModule<TConfig = any, TRegistry = any> {
  id: string; // Уникальный ID (например, 'grpc')

  // 1. Схема конфигурации для coolcinema.yaml
  // ZodType<Output, Def, Input> - разрешаем Input отличаться от TConfig (Output)
  schema: z.ZodType<TConfig, z.ZodTypeDef, any>;

  // 2. Генерация шаблона для init
  // Возвращает дефолтный объект конфигурации
  getTemplate(): TConfig;

  // 3. Обработка Push
  // Принимает конфиг из манифеста, читает файлы, добавляет их в контекст.
  // Возвращает данные, которые нужно сохранить в Catalog manifest.json.
  onPush(ctx: PushContext, config: TConfig): Promise<TRegistry>;

  // 4. Компиляция (CI)
  // Генерирует типы/клиенты (например, запускает buf).
  // Возвращает список созданных TS файлов (пути относительно outDir).
  onCompile(ctx: CompileContext, registryConfig: TRegistry): Promise<string[]>;

  // 5. Генерация кода для API (Index)
  // Модифицирует AST через ts-morph
  // serviceFile - это файл, представляющий сервис (например, src/services/identity.ts)
  generateApiCode(
    serviceName: string,
    serviceSlug: string,
    registryConfig: TRegistry,
    serviceFile: SourceFile,
  ): void;
}
