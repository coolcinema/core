import * as fs from "fs";
import * as path from "path";

const defsDir = path.join(__dirname, "../definitions");
const outDir = path.join(__dirname, "../src");

// Создаем папку src, если нет
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Добавляем типизацию для filter (f: string)
const files = fs
  .readdirSync(defsDir)
  .filter((f: string) => f.endsWith(".json"));
const services: Record<string, any> = {};

files.forEach((file: string) => {
  const filePath = path.join(defsDir, file);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    // Валидация данных (name, port)
    services[data.name] = data;
  } catch (e) {
    console.error(`Error parsing ${file}:`, e);
  }
});

const content = `/**
 * AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.
 * Run "npm run generate" to update.
 */

export const ServiceNames = {
${Object.keys(services)
  .map((key) => `  ${key}: '${services[key].slug}'`)
  .join(",\n")}
} as const;

export type ServiceName = typeof ServiceNames[keyof typeof ServiceNames];

export const Registry = {
${Object.keys(services)
  .map((key) => {
    // Генерируем URL прямо здесь, при сборке
    const url = `http://${services[key].slug}.coolcinema.svc.cluster.local:${services[key].port}`;
    return `  ${key}: {
    name: ServiceNames.${key},
    port: ${services[key].port},
    url: '${url}',
    description: '${services[key].description || ""}'
  }`;
  })
  .join(",\n")}
} as const;

export type RegistryKey = keyof typeof Registry;
`;

fs.writeFileSync(path.join(outDir, "index.ts"), content);
console.log(`Registry generated for ${Object.keys(services).length} services.`);
