import * as fs from "fs";
import * as yaml from "js-yaml";
import { z } from "zod";
import { BaseManifestSchema } from "../schemas/base";
import { HandlerModule } from "../types";

export class ManifestService {
  constructor(private handlers: Record<string, HandlerModule>) {}

  load(filePath: string): any {
    if (!fs.existsSync(filePath)) {
      throw new Error("Manifest not found");
    }

    let raw;
    try {
      raw = yaml.load(fs.readFileSync(filePath, "utf8"));
    } catch (e: any) {
      throw new Error(`Invalid YAML: ${e.message}`);
    }

    const Schema = this.createFullSchema().strict();
    return Schema.parse(raw);
  }

  createTemplate(serviceName: string, slug: string): string {
    const base = BaseManifestSchema.parse({
      metadata: {
        name: serviceName,
        slug: slug,
      },
    });

    const templateObj: any = { ...base };

    for (const [key, module] of Object.entries(this.handlers)) {
      if (module.defaults) {
        templateObj[key] = module.defaults;
      }
    }

    return yaml.dump(templateObj, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
    });
  }

  save(
    filePath: string,
    content: string,
    options: { overwrite?: boolean } = {},
  ) {
    if (fs.existsSync(filePath) && !options.overwrite) {
      throw new Error(`File already exists: ${filePath}`);
    }
    fs.writeFileSync(filePath, content);
  }

  private createFullSchema() {
    const extensions: Record<string, z.ZodTypeAny> = {};
    for (const [key, module] of Object.entries(this.handlers)) {
      extensions[key] = module.schema.optional();
    }
    return BaseManifestSchema.extend(extensions);
  }
}
