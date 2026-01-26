import * as path from "path";
import chalk from "chalk";
import { ICommand } from "./base.command";
import { ManifestService } from "../services/manifest.service";

export class InitCommand implements ICommand {
  constructor(private manifestService: ManifestService) {}

  async execute() {
    const targetPath = path.join(process.cwd(), "coolcinema.yaml");

    const dirName = path.basename(process.cwd());
    const name = this.toPascalCase(dirName);

    const content = this.manifestService.createTemplate(name, dirName);

    try {
      this.manifestService.save(targetPath, content);
      console.log(chalk.green("✅ Created coolcinema.yaml from schemas"));
    } catch (e: any) {
      console.error(chalk.red("❌ Error:"), e.message);
      process.exit(1);
    }
  }

  //
  private toPascalCase(str: string) {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (w) => w.toUpperCase())
      .replace(/[\s\-_]+/g, "");
  }
}
