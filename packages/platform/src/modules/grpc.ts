import { z } from "zod";
import * as path from "path";
import * as fs from "fs";
import { execSync } from "child_process";
import { PlatformModule, PushContext, CompileContext } from "../types";
import {
  SourceFile,
  VariableDeclarationKind,
  OptionalKind,
  GetAccessorDeclarationStructure,
} from "ts-morph";

// Схема: Словарь интерфейсов (auth, public -> { proto, service, port })
const GrpcConfigSchema = z.record(
  z.object({
    proto: z.string(), // Локальный путь: "src/proto/auth.proto"
    service: z.string(), // Имя сервиса в proto: "AuthService"
    port: z.number().default(5000), // Порт
  }),
);

// Данные в реестре: Словарь (auth -> { file: "auth.proto", service: "AuthService", port: 5000 })
interface GrpcRegistryData {
  interfaces: Record<string, { file: string; service: string; port: number }>;
}

export const GrpcModule: PlatformModule<
  z.infer<typeof GrpcConfigSchema>,
  GrpcRegistryData
> = {
  id: "grpc",
  schema: GrpcConfigSchema,

  getTemplate() {
    return {
      YOUR_INTERFACE_NAME: {
        proto: "path/to/your.proto",
        service: "YourServiceName",
        port: 5000,
      },
    };
  },

  async onPush(ctx: PushContext, config) {
    const interfaces: GrpcRegistryData["interfaces"] = {};

    for (const [key, contract] of Object.entries(config)) {
      // 1. Читаем файл
      const content = await ctx.readLocalFile(contract.proto);

      // 2. Определяем имя файла в каталоге (просто имя файла, без путей)
      // В каталоге у каждого сервиса своя папка, коллизий нет.
      const fileName = path.basename(contract.proto);

      // 3. Добавляем в список на отправку (в подпапку proto/)
      ctx.addFile(`proto/${fileName}`, content);

      // 4. Запоминаем для реестра (включая порт!)
      interfaces[key] = {
        file: `proto/${fileName}`,
        service: contract.service,
        port: contract.port,
      };
    }

    return { interfaces };
  },

  async onCompile(ctx: CompileContext, registryConfig) {
    const protoFiles = Object.values(registryConfig.interfaces).map(
      (i) => i.file,
    );
    if (protoFiles.length === 0) return [];

    const cmd = `grpc_tools_node_protoc 
      --ts_proto_out=${ctx.outDir} 
      --ts_proto_opt=outputServices=grpc-js,esModuleInterop=true,useOptionals=messages 
      -I ${ctx.serviceDir} 
      ${protoFiles.map((f) => path.join(ctx.serviceDir, f)).join(" ")}`;

    try {
      execSync(cmd, { stdio: "inherit" });
    } catch (e) {
      console.error(`Failed to compile gRPC for ${ctx.serviceName}`);
      throw e;
    }

    // Создаем index.ts, который экспортирует все сгенерированные файлы
    const exportStatements = protoFiles.map((f) => {
      // f = "proto/identity.proto" -> "./proto/identity"
      const importPath = "./" + f.replace(".proto", "");
      return `export * from '${importPath}';`;
    });

    fs.writeFileSync(
      path.join(ctx.outDir, "index.ts"),
      exportStatements.join("\n"),
    );

    return protoFiles.map((f) => f.replace(".proto", ".ts"));
  },

  generateApiCode(
    serviceName,
    serviceSlug,
    registryConfig,
    serviceFile: SourceFile,
  ) {
    // serviceFile - это файл, который будет экспортировать клиенты (src/services/identity.ts)

    // 1. Добавляем импорт createGrpcClient
    serviceFile.addImportDeclaration({
      moduleSpecifier: "@coolcinema/foundation",
      namedImports: ["createGrpcClient"],
    });

    // 2. Добавляем импорт метаданных из Catalog (для URL, если нужно, но мы берем из конфига)
    serviceFile.addImportDeclaration({
      moduleSpecifier: "@coolcinema/catalog",
      namedImports: [`${serviceName}Meta`],
    });

    const properties: OptionalKind<GetAccessorDeclarationStructure>[] = [];

    for (const [key, iface] of Object.entries(registryConfig.interfaces)) {
      const moduleName = path.basename(iface.file, ".proto");
      const clientName = `${iface.service}Client`;
      const importAlias = `${serviceName}${key}Client`;

      // 3. Импорт сгенерированного клиента из @coolcinema/catalog
      // Используем serviceSlug для пути
      serviceFile.addImportDeclaration({
        moduleSpecifier: `@coolcinema/catalog/dist/services/${serviceSlug}/${moduleName}`,
        namedImports: [`${clientName} as ${importAlias}`],
      });

      // 4. Формируем геттер
      properties.push({
        name: key,
        returnType: importAlias, // Явная типизация
        statements: [
          // Используем порт из интерфейса или метаданных
          // Используем serviceSlug из метаданных для хоста
          `const url = \`\${${serviceName}Meta.slug}:${iface.port}\`;`,
          `return createGrpcClient(${importAlias}, url);`,
        ],
      });
    }

    // 5. Добавляем объект grpc: { ... }

    serviceFile.addVariableStatement({
      declarationKind: VariableDeclarationKind.Const,
      isExported: true,
      declarations: [
        {
          name: "grpc",
          initializer: (writer) => {
            writer.block(() => {
              properties.forEach((p) => {
                writer.write(`get ${p.name}()`).block(() => {
                  if (p.statements && Array.isArray(p.statements)) {
                    p.statements.forEach((s) => writer.writeLine(String(s)));
                  }
                });
              });
            });
          },
        },
      ],
    });
  },
};
