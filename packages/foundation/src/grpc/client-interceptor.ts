import {
  ClientMiddleware,
  ClientMiddlewareCall,
  Metadata,
  CallOptions,
} from "nice-grpc";
import { getCurrentContext } from "../context/store";

// Middleware для клиента: добавляет заголовки из текущего контекста в исходящий запрос
export const contextClientMiddleware: ClientMiddleware = async function* <
  Request,
  Response,
>(call: ClientMiddlewareCall<Request, Response>, options: CallOptions) {
  const ctx = getCurrentContext();

  if (ctx) {
    // Гарантируем наличие Metadata объекта
    const metadata =
      options.metadata instanceof Metadata
        ? options.metadata
        : new Metadata(options.metadata);

    // Routing Headers
    Object.entries(ctx.routingHeaders).forEach(([key, val]) => {
      if (Array.isArray(val)) {
        val.forEach((v) => metadata.set(key, String(v)));
      } else {
        metadata.set(key, String(val));
      }
    });

    // Trace ID
    if (ctx.traceId) {
      metadata.set("x-trace-id", ctx.traceId);
    }

    options.metadata = metadata;
  }

  return yield* call.next(call.request, options);
};
