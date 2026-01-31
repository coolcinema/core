import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { CONFIG } from "../config";
import chalk from "chalk";

export interface IConflictResolver {
  resolve(rootDir: string): Promise<void>;
}

export class NodeModulesConflictResolver implements IConflictResolver {
  async resolve(rootDir: string): Promise<void> {
    const slug = this.getServiceSlug(rootDir);
    if (!slug) return;

    console.log(chalk.blue(`🧹 Resolving conflicts for service: ${slug}`));

    // Определяем папки, где могут лежать дубликаты (используем конфиг или конвенции)
    // В идеале эти ключи должны быть в CONFIG, но пока берем из структуры пакета
    const targetDirs = ["events", "schemas", "protos"];

    const contractsRoot = path.join(
      rootDir,
      "node_modules",
      CONFIG.GITHUB.OWNER ? `@${CONFIG.GITHUB.OWNER}` : "@coolcinema", // @coolcinema
      "contracts",
    );

    if (!fs.existsSync(contractsRoot)) return;

    for (const dirName of targetDirs) {
      const dirPath = path.join(contractsRoot, dirName);
      this.cleanDirectory(dirPath, slug);
    }
  }

  private getServiceSlug(rootDir: string): string | null {
    const manifestPath = path.join(rootDir, CONFIG.PATHS.MANIFEST);
    if (!fs.existsSync(manifestPath)) return null;

    try {
      const doc = yaml.load(fs.readFileSync(manifestPath, "utf8")) as any;
      return doc?.metadata?.slug || null;
    } catch (e) {
      return null;
    }
  }

  private cleanDirectory(dirPath: string, slug: string) {
    if (!fs.existsSync(dirPath)) return;

    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      // Стратегия: файл начинается с имени сервиса
      if (file.startsWith(`${slug}_`) && file.endsWith(".proto")) {
        const fullPath = path.join(dirPath, file);
        try {
          fs.unlinkSync(fullPath);
          // console.log(chalk.gray(`   - Removed: ${file}`)); // Verbose off
        } catch (e) {
          console.warn(chalk.yellow(`   ! Failed to remove ${file}`));
        }
      }
    }
  }
}
