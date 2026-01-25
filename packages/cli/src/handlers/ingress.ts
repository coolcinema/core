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
      // Генерируем дефолтный хост, если не задан: {key}.{slug}.coolcinema.local
      // Если key == 'main', то просто {slug}.coolcinema.local
      const prefix = key === "main" ? "" : `${key}.`;
      const host = rule.host || `${prefix}${ctx.serviceSlug}.coolcinema.local`;

      ingressRules.push({
        name: key,
        port: rule.port,
        host: host,
        path: rule.path,
      });

      // Если мы хотим ingress на этот порт, он должен быть открыт в Service
      ports.push({
        name: `http-${key}`,
        port: rule.port,
        protocol: "TCP",
      });
    }

    return {
      registryData: config, // Сохраняем "как есть" в реестр для справки
      appConfig: {
        ingress: ingressRules,
        ports: ports,
      },
    };
  },
};
