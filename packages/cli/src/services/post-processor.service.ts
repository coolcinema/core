import { GenGrpcCommand } from "../commands/gen-grpc.command";
import { GenHttpCommand } from "../commands/gen-http.command";
import { GenEventsCommand } from "../commands/gen-events.command";
import chalk from "chalk";

export class PostProcessor {
  async run() {
    console.log(chalk.magenta("✨ Running post-processors..."));
    const strategies = [
      new GenGrpcCommand(),
      new GenEventsCommand(),
      new GenHttpCommand(),
    ];

    for (const cmd of strategies) {
      if (cmd.postProcess) await cmd.postProcess();
    }
  }
}
