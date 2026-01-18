import { Interceptor, InterceptingCall } from "@grpc/grpc-js";
import { getCurrentContext } from "../context/store";

export const contextClientInterceptor: Interceptor = (options, nextCall) => {
  return new InterceptingCall(nextCall(options), {
    start: (metadata, listener, nextStart) => {
      const ctx = getCurrentContext();

      if (ctx) {
        // Прокидываем заголовки Telepresence
        Object.entries(ctx.routingHeaders).forEach(([key, val]) => {
          if (Array.isArray(val)) {
            val.forEach((v) => metadata.add(key, String(v)));
          } else {
            metadata.add(key, String(val));
          }
        });

        // Прокидываем TraceID
        if (ctx.traceId) {
          metadata.add("x-trace-id", ctx.traceId);
        }
      }

      nextStart(metadata, listener);
    },
  });
};
