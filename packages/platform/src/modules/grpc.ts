import { z } from "zod";
import * as path from "path";
import * as fs from "fs";
import { execSync } from "child_process";
import {
  PlatformModule,
  PushContext,
  CompileContext,
  PortDefinition,
  PushResult,
} from "../types";
import {
  SourceFile,
  VariableDeclarationKind,
  OptionalKind,
  GetAccessorDeclarationStructure,
} from "ts-morph";

const GrpcConfigSchema = z.record(
  z.object({
    proto: z.string(),
    service: z.string().optional(),
    port: z.number().default(5000),
  }),
);

type GrpcRegistryData = Record<
  string,
  { file: string; service: string; port: number }
>;

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
        port: 5000,
      },
    };
  },

  async onPush(
    ctx: PushContext,
    config: z.infer<typeof GrpcConfigSchema>,
  ): Promise<PushResult<GrpcRegistryData>> {
    const registryData: GrpcRegistryData = {};
    const ports: PortDefinition[] = [];

    for (const [key, contract] of Object.entries(config)) {
      const content = await ctx.readLocalFile(contract.proto);

      let serviceName = contract.service;
      if (!serviceName) {
        const match = content.match(/service\s+(\w+)\s*\{/);
        if (match) {
          serviceName = match[1];
        } else {
          throw new Error(
            `Could not auto-detect service name in ${contract.proto}. Please specify 'service' field.`,
          );
        }
      }

      const fileName = path.basename(contract.proto);
      ctx.addFile(`proto/${fileName}`, content);

      registryData[key] = {
        file: `proto/${fileName}`,
        service: serviceName,
        port: contract.port,
      };

      // Собираем порты
      const existing = ports.find((p) => p.port === contract.port);
      if (!existing) {
        ports.push({ name: "grpc", port: contract.port, protocol: "TCP" });
      }
    }

    // Возвращаем структуру PushResult
    return { registryData, ports };
  },

  async onCompile(ctx: CompileContext, registryConfig: GrpcRegistryData) {
    const protoFiles = Object.values(registryConfig).map((i) => i.file);
    if (protoFiles.length === 0) return [];

    // Используем стандартный grpc-js (или nice-grpc если мигрировали)
    // Здесь предполагаем базовую версию из Phase 1 (grpc-js)
    const cmd = [
      "grpc_tools_node_protoc",
      `--ts_proto_out=${ctx.outDir}`,
      "--ts_proto_opt=outputServices=grpc-js,esModuleInterop=true,useOptionals=messages",
      `-I ${ctx.serviceDir}`,
      protoFiles.map((f) => path.join(ctx.serviceDir, f)).join(" "),
    ].join(" ");

    try {
      execSync(cmd, { stdio: "inherit" });
    } catch (e) {
      console.error(`Failed to compile gRPC for ${ctx.serviceName}`);
      throw e;
    }

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
    serviceFile.addImportDeclaration({
      moduleSpecifier: "@coolcinema/foundation",
      namedImports: ["createGrpcClient"],
    });

    serviceFile.addImportDeclaration({
      moduleSpecifier: "@coolcinema/catalog",
      namedImports: [`${serviceName}Meta`],
    });

    const properties: OptionalKind<GetAccessorDeclarationStructure>[] = [];

    for (const [key, iface] of Object.entries(registryConfig)) {
      const moduleName = iface.file.replace(".proto", "");
      const clientName = `${iface.service}Client`;
      const importAlias = `${serviceName}${key}Client`;

      serviceFile.addImportDeclaration({
        moduleSpecifier: `@coolcinema/catalog/dist/services/${serviceSlug}/${moduleName}`,
        namedImports: [`${clientName} as ${importAlias}`],
      });

      properties.push({
        name: key,
        returnType: importAlias,
        statements: [
          `const url = \`\${${serviceName}Meta.slug}:${iface.port}\`;`,
          `return createGrpcClient(${importAlias}, url);`,
        ],
      });
    }

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
