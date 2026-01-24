import {
  ClientMiddleware,
  ClientMiddlewareCall,
  ServerMiddleware,
  ServerMiddlewareCall,
  CallContext,
  Metadata,
  CallOptions,
} from "nice-grpc";
import { getCurrentContext, runInContext } from "../../context/store";
import { CONTEXT_KEYS, PROPAGATION_HEADERS } from "../../context/keys";

// Client: Inject context into metadata
export const clientMiddleware: ClientMiddleware = async function* <
  Request,
  Response,
>(call: ClientMiddlewareCall<Request, Response>, options: CallOptions) {
  const ctx = getCurrentContext();

  if (ctx) {
    const metadata =
      options.metadata instanceof Metadata
        ? options.metadata
        : new Metadata(options.metadata);

    // 1. Trace ID
    if (ctx.traceId) {
      metadata.set(CONTEXT_KEYS.TRACE_ID, ctx.traceId);
    }

    // 2. Generic Headers
    Object.entries(ctx.headers).forEach(([k, v]) => {
      // Избегаем дублирования TraceID, если он есть в headers
      if (k === CONTEXT_KEYS.TRACE_ID) return;

      if (Array.isArray(v)) v.forEach((val) => metadata.append(k, val));
      else metadata.set(k, v);
    });

    options.metadata = metadata;
  }

  return yield* call.next(call.request, options);
};

// Server: Extract context from metadata
export const serverMiddleware: ServerMiddleware = async function* <
  Request,
  Response,
>(call: ServerMiddlewareCall<Request, Response>, context: CallContext) {
  const metadata = context.metadata;
  const headers: Record<string, string | string[]> = {};

  // 1. Извлекаем все известные заголовки
  for (const key of PROPAGATION_HEADERS) {
    const val = metadata.get(key);
    if (val) {
      headers[key] = Array.isArray(val) ? val.map(String) : String(val);
    }
  }

  // 2. Формируем контекст
  const appCtx = {
    traceId:
      typeof headers[CONTEXT_KEYS.TRACE_ID] === "string"
        ? (headers[CONTEXT_KEYS.TRACE_ID] as string)
        : undefined,
    headers,
  };

  // 3. Запускаем в контексте
  const generator = runInContext(appCtx, () =>
    call.next(call.request, context),
  );
  return yield* generator;
};
