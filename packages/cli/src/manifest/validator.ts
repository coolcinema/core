import * as fs from "fs";
import * as yaml from "js-yaml";
import chalk from "chalk";
import { z, ZodIssue } from "zod";
import { BaseManifestSchema } from "../schemas/base";
import { handlers } from "../handlers";

export function createFullSchema() {
  const extensions: Record<string, z.ZodTypeAny> = {};

  for (const [key, module] of Object.entries(handlers)) {
    extensions[key] = module.schema.optional();
  }

  return BaseManifestSchema.extend(extensions);
}

export function loadManifest(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error("Manifest not found");
  }

  let raw;
  try {
    raw = yaml.load(fs.readFileSync(filePath, "utf8"));
  } catch (e: any) {
    throw new Error(`Invalid YAML: ${e.message}`);
  }

  const Schema = createFullSchema().strict();

  try {
    return Schema.parse(raw);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      console.error(chalk.red("❌ Manifest Validation Failed:"));
      // Using .issues instead of .errors for better compatibility with strict types/versions
      (err as z.ZodError<any>).issues.forEach((e: ZodIssue) => {
        const pathStr = e.path.join(".");
        console.error(chalk.yellow(`- [${pathStr}]: ${e.message}`));

        if (
          e.code === "unrecognized_keys" &&
          e.path.length === 1 &&
          e.path[0] === "metadata"
        ) {
          // @ts-ignore - keys exists on ZodUnrecognizedKeysIssue
          const badKey = e.keys[0];
          if (handlers[badKey]) {
            console.log(
              chalk.cyan(
                `  Tip: '${badKey}' should be at the ROOT level, not inside 'metadata'. Check indentation.`,
              ),
            );
          }
        }
      });
      process.exit(1);
    }
    throw err;
  }
}
