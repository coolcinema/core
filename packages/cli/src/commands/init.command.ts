import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import { ICommand } from "./base.command";
import { ManifestService } from "../services/manifest.service";
import { ScaffoldService } from "../services/scaffold.service";
import { CONFIG } from "../config";

export class InitCommand implements ICommand {
  constructor(
    private manifestService: ManifestService,
    private scaffoldService: ScaffoldService,
  ) {}

  async execute() {
    const targetPath = path.join(process.cwd(), CONFIG.PATHS.MANIFEST);
    if (fs.existsSync(targetPath)) {
      console.error(chalk.red(`❌ ${CONFIG.PATHS.MANIFEST} already exists`));
      process.exit(1);
    }

    const dirName = path.basename(process.cwd());
    const name = this.toPascalCase(dirName);

    // 1. Manifest
    const content = this.manifestService.createTemplate(name, dirName);
    this.manifestService.save(targetPath, content);

    // 2. Structure & Config
    this.scaffoldService.createStructure();
    this.scaffoldService.createBufConfig();

    console.log(
      chalk.green("✅ Service initialized with Proto-First structure."),
    );
  }

  private toPascalCase(str: string) {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (w) => w.toUpperCase())
      .replace(/[\s\-_]+/g, "");
  }
}
