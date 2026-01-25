import { z } from "zod";
import { HandlerModule } from "../types";

const IngressRuleSchema = z
  .object({
    port: z.number(),
    host: z.string().optional(),
    path: z.string().default("/"),
  })
  .strict();

const IngressSectionSchema = z.record(z.string(), IngressRuleSchema);

const defaults = {
  main: {
    port: 3000,
    path: "/",
  },
};

export const IngressHandler: HandlerModule = {
  schema: IngressSectionSchema,
  defaults,

  async push(ctx, rawConfig) {
    const config = rawConfig as z.infer<typeof IngressSectionSchema>;
    const ingressRules: any[] = [];
    const ports: any[] = [];

    console.log("[DEBUG] IngressHandler processing keys:", Object.keys(config));

    for (const [key, rule] of Object.entries(config)) {
      const prefix = key === "main" ? "" : `${key}.`;
      const host = rule.host || `${prefix}${ctx.serviceSlug}.coolcinema.local`;

      ingressRules.push({
        name: key,
        port: rule.port,
        host: host,
        path: rule.path,
      });

      // Открываем порт в Service
      ports.push({
        name: `http-${key}`,
        port: rule.port,
        protocol: "TCP",
      });
    }

    return {
      registryData: config,
      appConfig: {
        ingress: ingressRules,
        ports: ports,
      },
    };
  },
};
