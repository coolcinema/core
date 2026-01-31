import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { CONFIG } from "../config";
import chalk from "chalk";

export class ConfigManager {
  private backupPath: string | null = null;
  private configPath: string;

  constructor(private rootDir: string) {
    this.configPath = path.resolve(rootDir, CONFIG.PATHS.BUF.WORK);
  }

  prepare(): boolean {
    if (!fs.existsSync(this.configPath)) {
      console.error(chalk.red(`❌ ${CONFIG.PATHS.BUF.WORK} not found.`));
      return false;
    }

    try {
      const originalContent = fs.readFileSync(this.configPath, "utf8");
      const config = yaml.load(originalContent) as any;

      if (config && Array.isArray(config.directories)) {
        const validDirectories = config.directories.filter((dir: string) =>
          this.hasProtoFiles(path.resolve(this.rootDir, dir)),
        );

        if (validDirectories.length !== config.directories.length) {
          console.log(
            chalk.gray(`🔧 Excluding empty directories from build...`),
          );
          this.backupPath = `${this.configPath}.bak`;
          fs.writeFileSync(this.backupPath, originalContent);

          config.directories = validDirectories;
          fs.writeFileSync(this.configPath, yaml.dump(config));
        }
      }
      return true;
    } catch (e) {
      console.error(chalk.red("❌ Failed to parse workspace config."));
      return false;
    }
  }

  restore() {
    if (this.backupPath && fs.existsSync(this.backupPath)) {
      fs.writeFileSync(this.configPath, fs.readFileSync(this.backupPath));
      fs.unlinkSync(this.backupPath);
    }
  }

  private hasProtoFiles(dir: string): boolean {
    if (!fs.existsSync(dir)) return false;
    try {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        if (file.isDirectory()) {
          if (this.hasProtoFiles(path.join(dir, file.name))) return true;
        } else if (file.name.endsWith(".proto")) {
          return true;
        }
      }
    } catch (e) {
      return false;
    }
    return false;
  }
}
