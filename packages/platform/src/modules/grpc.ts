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

export const GrpcModule: PlatformModule = {
  id: "grpc",
  schema: GrpcConfigSchema,

  getTemplate() {
    return {
      _ENTITY_: {
        proto: "path/to/your.proto",
        port: 5000,
      },
    };
  },

  async onPush(ctx: PushContext, config: z.infer<typeof GrpcConfigSchema>) {
    const registryData: GrpcRegistryData = {};

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
    }

    return registryData;
  },

  async onCompile(ctx: CompileContext, registryConfig: GrpcRegistryData) {
    const protoFiles = Object.values(registryConfig).map((i) => i.file);
    if (protoFiles.length === 0) return [];

    // Используем nice-grpc для генерации
    const cmd = [
      "grpc_tools_node_protoc",
      `--ts_proto_out=${ctx.outDir}`,
      "--ts_proto_opt=outputServices=nice-grpc,outputServices=generic-definitions,esModuleInterop=true,useExactTypes=false",
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

      // nice-grpc имена
      const definitionName = `${iface.service}Definition`;
      const clientInterface = `${iface.service}Client`;

      const importAliasDef = `${serviceName}${key}Def`;
      const importAliasClient = `${serviceName}${key}Client`;

      serviceFile.addImportDeclaration({
        moduleSpecifier: `@coolcinema/catalog/dist/services/${serviceSlug}/${moduleName}`,
        namedImports: [
          `${definitionName} as ${importAliasDef}`,
          `${clientInterface} as ${importAliasClient}`,
        ],
      });

      properties.push({
        name: key,
        returnType: importAliasClient,
        statements: [
          `const url = \`\${${serviceName}Meta.slug}:${iface.port}\`;`,
          // Передаем Definition в фабрику
          `return createGrpcClient<${importAliasClient}>(${importAliasDef}, url);`,
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
