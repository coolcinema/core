import chalk from "chalk";
import { z, ZodIssue, ZodIssueCode } from "zod";
import { HandlerModule } from "../types";

type Hinter = (
  issue: ZodIssue,
  handlers: Record<string, HandlerModule>,
) => string | null;

const IndentationHinter: Hinter = (issue, handlers) => {
  if (issue.code !== ZodIssueCode.unrecognized_keys) return null;

  if (issue.path.length !== 1 || issue.path[0] !== "metadata") return null;

  for (const key of issue.keys) {
    if (handlers[key]) {
      return `Key '${key}' found inside 'metadata'. It should be at the ROOT level. Check indentation!`;
    }
  }

  return null;
};

const activeHinters: Hinter[] = [IndentationHinter];

export class ErrorHandler {
  static handle(err: any, handlers: Record<string, HandlerModule> = {}) {
    if (err instanceof z.ZodError) {
      this.handleZodError(err, handlers);
    } else {
      this.handleGenericError(err);
    }

    process.exit(1);
  }

  private static handleZodError(
    err: z.ZodError,
    handlers: Record<string, HandlerModule>,
  ) {
    console.error(chalk.red("❌ Manifest Validation Failed:"));

    for (const issue of err.issues) {
      this.printIssue(issue);
      this.printHints(issue, handlers);
    }
  }

  private static handleGenericError(err: any) {
    console.error(chalk.red("❌ Error:"), err.message || err);
  }

  private static printIssue(issue: ZodIssue) {
    const pathStr = issue.path.join(".");
    console.error(chalk.yellow(`- [${pathStr}]: ${issue.message}`));
  }

  private static printHints(
    issue: ZodIssue,
    handlers: Record<string, HandlerModule>,
  ) {
    for (const hinter of activeHinters) {
      const hint = hinter(issue, handlers);
      if (hint) {
        console.log(chalk.cyan(`  💡 Tip: ${hint}`));
      }
    }
  }
}
