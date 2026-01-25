import { z } from "zod";

export const MetadataSchema = z
  .object({
    name: z.string().default("MyService"),
    slug: z.string().default("my-service"),
    description: z.string().default("Service description"),
    language: z.string().optional(),
  })
  .strict();

export const BaseManifestSchema = z
  .object({
    version: z.string().default("1.0.0"),
    metadata: MetadataSchema,
  })
  .strict();
