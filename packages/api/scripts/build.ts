import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";
import { Project, VariableDeclarationKind } from "ts-morph";
import { Platform } from "@coolcinema/platform";

// Путь к каталогу (сырым данным)
const servicesDir = path.join(__dirname, "../../catalog/services");
const srcDir = path.join(__dirname, "../src");

async function build() {
  console.log("🚀 Building API Facade...");

  // Инициализируем ts-morph проект
  const project = new Project();

  // Создаем (или перезаписываем) index.ts
  const sourceFile = project.createSourceFile(
    path.join(srcDir, "index.ts"),
    "", // Empty content
    { overwrite: true },
  );

  // 1. Ищем манифесты
  const manifestFiles = await glob(path.join(servicesDir, "*/manifest.json"));

  const serviceProperties: any[] = [];

  for (const file of manifestFiles) {
    const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
    const { name } = manifest.metadata;

    // Создаем отдельный файл для сервиса, чтобы не загромождать index.ts
    // src/services/identity.ts
    const serviceFileName = `${name.toLowerCase()}.ts`;
    const serviceFile = project.createSourceFile(
      path.join(srcDir, "services", serviceFileName),
      "",
      { overwrite: true },
    );

    console.log(`   - Generating service: ${name}`);

    // 2. Делегируем генерацию кода модулям
    // Каждый модуль добавляет свои импорты и экспорты в serviceFile
    for (const [moduleId, config] of Object.entries(manifest.interfaces)) {
      const module = Platform.get(moduleId);
      if (!module) continue;

      // Модуль модифицирует AST файла serviceFile
      // Добавляет import { ... } from ...
      // Добавляет export const grpc = ...
      module.generateApiCode(name, manifest.metadata.slug, config, serviceFile);
    }

    // 3. Добавляем этот сервис в главный index.ts
    // import * as identity from './services/identity';
    sourceFile.addImportDeclaration({
      moduleSpecifier: `./services/${name.toLowerCase()}`,
      namespaceImport: name, // Используем имя сервиса (IdentityService)
    });

    // Экспортируем переменную с именем сервиса
    // export const IdentityService = identity;
    sourceFile.addVariableStatement({
      declarationKind: VariableDeclarationKind.Const,
      isExported: true,
      declarations: [
        {
          name: name, // IdentityService
          initializer: name, // Ссылка на импорт
        },
      ],
    });
  }

  // Сохраняем все файлы
  await project.save();
  console.log("✅ API Facade Built.");
}

build();
