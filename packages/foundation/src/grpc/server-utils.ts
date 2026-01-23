import { ServerMiddleware, ServerMiddlewareCall, CallContext } from "nice-grpc";
import { runInContext } from "../context/store";

// Middleware для сервера: извлекает заголовки и создает контекст
export const contextServerMiddleware: ServerMiddleware = async function* <
  Request,
  Response,
>(call: ServerMiddlewareCall<Request, Response>, context: CallContext) {
  const metadata = context.metadata;
  const routingHeaders: Record<string, string | string[]> = {};

  const keys = ["x-telepresence-intercept-id", "x-request-id", "x-trace-id"];

  for (const key of keys) {
    const val = metadata.get(key);
    if (val) {
      // Приводим к строке (val может быть string или string[])
      // Если это бинарник, он не попадет в get(key) по умолчанию без опций, но на всякий случай String()
      routingHeaders[key] = Array.isArray(val) ? val.map(String) : String(val);
    }
  }

  const traceId = metadata.get("x-trace-id");

  const appCtx = {
    traceId: typeof traceId === "string" ? traceId : undefined,
    routingHeaders,
  };

  // Оборачиваем создание генератора в контекст
  // runInContext выполнится синхронно и вернет AsyncGenerator, созданный внутри
  const generator = runInContext(appCtx, () => {
    return call.next(call.request, context);
  });

  // Делегируем выполнение этому генератору
  // Так как генератор был создан внутри runInContext, он захватил контекст (для первого тика)
  // Для полной поддержки async context propagation в генераторах нужны хаки, но для Unary это работает.
  return yield* generator;
};
