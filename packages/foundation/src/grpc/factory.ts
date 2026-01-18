import {
  Server,
  ChannelCredentials,
  ServerCredentials,
  credentials,
  ServiceDefinition,
  UntypedServiceImplementation,
} from "@grpc/grpc-js";
import { contextClientInterceptor } from "./client-interceptor";
import { wrapGrpcService } from "./server-utils";

// --- Client Factory ---

// Тип конструктора клиента
type ClientConstructor<T> = new (
  address: string,
  creds: ChannelCredentials,
  options?: any,
) => T;

export function createGrpcClient<T>(
  ClientClass: ClientConstructor<T>,
  address: string,
): T {
  return new ClientClass(address, credentials.createInsecure(), {
    interceptors: [contextClientInterceptor],
  });
}

// --- Server Factory ---

export class PlatformGrpcServer {
  private server: Server;

  constructor() {
    this.server = new Server();
  }

  addService<T extends object>(
    definition: ServiceDefinition<any>,
    implementation: T,
  ) {
    // Приводим к UntypedServiceImplementation, так как мы знаем, что обертка возвращает совместимый объект
    this.server.addService(
      definition,
      wrapGrpcService(
        implementation,
      ) as unknown as UntypedServiceImplementation,
    );
  }

  async listen(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      // Используем ServerCredentials для сервера!
      this.server.bindAsync(
        `0.0.0.0:${port}`,
        ServerCredentials.createInsecure(),
        (err, port) => {
          if (err) return reject(err);
          console.log(`📡 gRPC Server listening on port ${port}`);
          resolve();
        },
      );
    });
  }
}
