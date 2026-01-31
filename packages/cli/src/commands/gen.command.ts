import { ICommand } from "./base.command";
import { NodeModulesConflictResolver } from "../services/conflict-resolver.service";
import { ConfigManager } from "../services/config-manager.service";
import { BufRunner } from "../services/buf-runner.service";
import { PostProcessor } from "../services/post-processor.service";
import chalk from "chalk";

export class GenCommand implements ICommand {
  async execute() {
    const rootDir = process.cwd();

    const conflictResolver = new NodeModulesConflictResolver();
    const configManager = new ConfigManager(rootDir);
    const bufRunner = new BufRunner(rootDir);
    const postProcessor = new PostProcessor();

    console.log(chalk.blue("🚀 Starting Generation Pipeline"));

    try {
      await conflictResolver.resolve(rootDir);

      if (!configManager.prepare()) return;

      bufRunner.clean();
      if (!bufRunner.run()) process.exit(1);
    } finally {
      configManager.restore();
    }

    await postProcessor.run();

    console.log(chalk.green("🏁 Pipeline finished."));
  }
}
