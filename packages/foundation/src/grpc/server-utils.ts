import { ServerUnaryCall, sendUnaryData } from "@grpc/grpc-js";
import { runInContext } from "../context/store";

const IMPORTANT_HEADERS = [
  "x-telepresence-intercept-id",
  "x-request-id",
  "x-trace-id",
];

// Хелпер: gRPC metadata может быть буфером, нам нужны строки
const metadataToString = (val: string | Buffer): string => {
  if (Buffer.isBuffer(val)) {
    return val.toString("utf-8");
  }
  return val;
};

// Тип для gRPC метода (используем unknown вместо any для безопасности)
type GrpcMethod = (
  call: ServerUnaryCall<unknown, unknown>,
  callback: sendUnaryData<unknown>,
) => void;

// Обертка для одного метода
const wrapMethod = (method: GrpcMethod): GrpcMethod => {
  return (call, callback) => {
    const metadata = call.metadata;
    const routingHeaders: Record<string, string | string[]> = {};

    // Извлекаем заголовки
    for (const key of IMPORTANT_HEADERS) {
      const values = metadata.get(key);
      if (values.length > 0) {
        // Конвертируем все значения в строки
        const stringValues = values.map(metadataToString);
        routingHeaders[key] =
          stringValues.length === 1 ? stringValues[0] : stringValues;
      }
    }

    const traceIdRaw = metadata.get("x-trace-id")[0];

    const ctx = {
      traceId: traceIdRaw ? metadataToString(traceIdRaw) : undefined,
      routingHeaders,
    };

    // Запускаем оригинальный метод внутри контекста
    runInContext(ctx, () => method(call, callback));
  };
};

// Обертка для всего объекта реализации сервиса
export const wrapGrpcService = <T extends object>(implementation: T): T => {
  const wrapped: any = {};
  for (const [key, value] of Object.entries(implementation)) {
    if (typeof value === "function") {
      wrapped[key] = wrapMethod(value as GrpcMethod);
    } else {
      wrapped[key] = value;
    }
  }
  return wrapped as T;
};
