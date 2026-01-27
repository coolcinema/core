import { RouteConfig } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

export interface RouteOptions<
  P extends z.ZodTypeAny = z.ZodTypeAny,
  B extends z.ZodTypeAny = z.ZodTypeAny,
  Q extends z.ZodTypeAny = z.ZodTypeAny,
  R extends z.ZodTypeAny = z.ZodTypeAny,
> {
  method: "get" | "post" | "put" | "delete" | "patch";
  path: string;
  summary?: string;
  description?: string;
  tags?: string[];
  params?: P;
  query?: Q;
  body?: B;
  response: R;
  status?: number; // Default 200
}

export function createRoute<
  P extends z.ZodTypeAny,
  B extends z.ZodTypeAny,
  Q extends z.ZodTypeAny,
  R extends z.ZodTypeAny,
>(options: RouteOptions<P, B, Q, R>) {
  const status = options.status || 200;

  const config: RouteConfig = {
    method: options.method,
    path: options.path,
    summary: options.summary,
    description: options.description,
    tags: options.tags,
    request: {
      params: options.params,
      query: options.query,
      body: options.body
        ? {
            content: {
              "application/json": { schema: options.body },
            },
          }
        : undefined,
    },
    responses: {
      [status]: {
        description: "Success",
        content: {
          "application/json": { schema: options.response },
        },
      },
    },
  };

  return {
    config,
    // Тип функции-обработчика для реализации
    Handler: {} as (req: {
      params: z.infer<P>;
      query: z.infer<Q>;
      body: z.infer<B>;
    }) => Promise<z.infer<R>>,
  };
}

/**
 * Утилита для вывода типов хендлеров из объекта роутов.
 * @example
 * export type ApiHandlers = InferHandlers<typeof routes>;
 */
export type InferHandlers<T extends Record<string, { Handler: any }>> = {
  [K in keyof T]: T[K]["Handler"];
};
