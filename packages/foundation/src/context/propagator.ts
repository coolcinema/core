import { CONTEXT_KEYS } from "./keys";
import { AppContext } from "./store";

export type HeaderSetter = (key: string, values: string[]) => void;

export const Propagator = {
  /**
   * Внедряет контекст в исходящий запрос через функцию-сеттер.
   * Универсально для HTTP Headers, gRPC Metadata и Axios.
   */
  inject(ctx: AppContext | undefined, setHeader: HeaderSetter) {
    if (!ctx) return;

    // 1. Trace ID (приоритет)
    if (ctx.traceId) {
      setHeader(CONTEXT_KEYS.TRACE_ID, [ctx.traceId]);
    }

    // 2. Остальные заголовки
    for (const [key, value] of Object.entries(ctx.headers)) {
      if (key === CONTEXT_KEYS.TRACE_ID) continue; // Избегаем дублирования

      // Нормализуем значение в массив строк
      const values = Array.isArray(value) ? value : [value];
      setHeader(key, values);
    }
  },
};
