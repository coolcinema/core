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
    service: z.string().optional(), // Имя сервиса в proto (опционально, авто-детект)
    port: z.number().default(5000), // Порт
  }),
);

// Данные в реестре: Словарь (auth -> { file: "auth.proto", service: "AuthService", port: 5000 })
// ПЛОСКАЯ СТРУКТУРА (без вложенного interfaces)
type GrpcRegistryData = Record<
  string,
  { file: string; service: string; port: number }
>;

// Убираем явные дженерики
export const GrpcModule: PlatformModule = {
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

  async onPush(ctx: PushContext, config: z.infer<typeof GrpcConfigSchema>) {
    const registryData: GrpcRegistryData = {};

    for (const [key, contract] of Object.entries(config)) {
      // 1. Читаем файл
      const content = await ctx.readLocalFile(contract.proto);

      // Авто-определение имени сервиса
      let serviceName = contract.service;
      if (!serviceName) {
        const match = content.match(/service\s+(\w+)\s*\{/);
        if (match) {
          serviceName = match[1];
        } else {
          throw new Error(
            `Could not auto-detect service name in ${contract.proto}. Please specify 'service' field in coolcinema.yaml`,
          );
        }
      }

      // 2. Определяем имя файла в каталоге
      const fileName = path.basename(contract.proto);

      // 3. Добавляем в список на отправку
      ctx.addFile(`proto/${fileName}`, content);

      // 4. Запоминаем для реестра (ПЛОСКАЯ СТРУКТУРА)
      registryData[key] = {
        file: `proto/${fileName}`,
        service: serviceName,
        port: contract.port,
      };
    }

    return registryData;
  },

  async onCompile(ctx: CompileContext, registryConfig: GrpcRegistryData) {
    // Итерируемся по значениям объекта (registryConfig и есть словарь)
    const protoFiles = Object.values(registryConfig).map((i) => i.file);
    if (protoFiles.length === 0) return [];

    const cmd = `grpc_tools_node_protoc --ts_proto_out=${ctx.outDir} --ts_proto_opt=outputServices=grpc-js,esModuleInterop=true,useOptionals=messages -I ${ctx.serviceDir} ${protoFiles.map((f) => path.join(ctx.serviceDir, f)).join(" ")}`;

    try {
      execSync(cmd, { stdio: "inherit" });
    } catch (e) {
      console.error(`Failed to compile gRPC for ${ctx.serviceName}`);
      throw e;
    }

    // Создаем index.ts
    const exportStatements = protoFiles.map((f) => {
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
    serviceName: string,
    serviceSlug: string,
    registryConfig: GrpcRegistryData,
    serviceFile: SourceFile,
  ) {
    // 1. Добавляем импорт createGrpcClient
    serviceFile.addImportDeclaration({
      moduleSpecifier: "@coolcinema/foundation",
      namedImports: ["createGrpcClient"],
    });

    // 2. Добавляем импорт метаданных
    serviceFile.addImportDeclaration({
      moduleSpecifier: "@coolcinema/catalog",
      namedImports: [`${serviceName}Meta`],
    });

    const properties: OptionalKind<GetAccessorDeclarationStructure>[] = [];

    // Итерируемся по словарю
    for (const [key, iface] of Object.entries(registryConfig)) {
      const moduleName = iface.file.replace(".proto", "");
      const clientName = `${iface.service}Client`;
      const importAlias = `${serviceName}${key}Client`;

      // 3. Импорт
      serviceFile.addImportDeclaration({
        moduleSpecifier: `@coolcinema/catalog/dist/services/${serviceSlug}/${moduleName}`,
        namedImports: [`${clientName} as ${importAlias}`],
      });

      // 4. Геттер
      properties.push({
        name: key,
        returnType: importAlias,
        statements: [
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
