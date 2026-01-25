import * as yaml from "js-yaml";
import { BaseManifestSchema } from "../schemas/base";
import { handlers } from "../handlers";

export function generateTemplate(serviceName: string, slug: string): string {
  const base = BaseManifestSchema.parse({
    metadata: {
      name: serviceName,
      slug: slug,
    },
  });

  const templateObj: any = { ...base };

  for (const [key, module] of Object.entries(handlers)) {
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
