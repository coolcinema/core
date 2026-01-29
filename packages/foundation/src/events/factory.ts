//  packages/foundation/src/events/factory.ts
import { AmqpTransport } from "./amqp";
import { getCurrentContext, runInContext } from "../context/store";
import { Propagator } from "../context/propagator";
import { CONTEXT_KEYS } from "src/context/keys";

export function createPublisher<
  TDefs extends { operations: any; channels: any },
>(transport: AmqpTransport, defs: TDefs) {
  const channelWrapper = transport.getChannel();
  const publisher: any = {};

  for (const [opKey, opVal] of Object.entries(defs.operations)) {
    const op = opVal as any;
    if (op.action !== "send") continue;

    const channelDef = defs.channels[op.channelId];
    const exchange = channelDef.address;

    publisher[opKey] = async (payload: any) => {
      const headers: Record<string, string> = {};
      const ctx = getCurrentContext();
      Propagator.inject(ctx, (k, v) => {
        headers[k] = Array.isArray(v) ? v[0] : v;
      });

      await channelWrapper.publish(exchange, "", payload, {
        headers: headers,
        contentType: "application/json",
        timestamp: Date.now(),
      });
    };
  }

  return publisher as Record<
    keyof TDefs["operations"],
    (payload: any) => Promise<void>
  >;
}

export function createConsumer(
  transport: AmqpTransport,
  myServiceSlug: string,
  sourceDefs: any,
) {
  const connection = transport.getChannel();

  return {
    subscribe: async (
      opKey: string,
      handler: (msg: any, ctx: any) => Promise<void>,
    ) => {
      const op = sourceDefs.operations[opKey];
      if (!op || op.action !== "send")
        throw new Error(`Operation ${opKey} is not a send operation`);

      const channelDef = sourceDefs.channels[op.channelId];
      const exchange = channelDef.address;
      const queueName = `${myServiceSlug}.listen.${exchange}`;

      await connection.addSetup(async (channel: any) => {
        await channel.assertExchange(exchange, "topic", { durable: true });
        await channel.assertQueue(queueName, { durable: true });
        await channel.bindQueue(queueName, exchange, "#");

        await channel.consume(queueName, async (msg: any) => {
          if (!msg) return;

          try {
            const content = JSON.parse(msg.content.toString());
            const headers = msg.properties.headers || {};

            const traceId = headers[CONTEXT_KEYS.TRACE_ID]?.toString();
            const normalizedHeaders: Record<string, string | string[]> = {};

            for (const [key, value] of Object.entries(headers)) {
              if (Array.isArray(value)) {
                normalizedHeaders[key] = value.map(String);
              } else if (value !== undefined && value !== null) {
                normalizedHeaders[key] = String(value);
              }
            }

            const appCtx = {
              traceId: traceId,
              headers: normalizedHeaders,
            };

            await runInContext(appCtx, async () => {
              await handler(content, appCtx);
            });

            channel.ack(msg);
          } catch (e) {
            console.error(`Error processing message from ${queueName}:`, e);
          }
        });
      });
    },
  };
}
