import { GrpcHandler } from "./grpc";

export interface PushContext {
  serviceSlug: string;
  readFile(path: string): Promise<string>;
  uploadFile(remotePath: string, content: string): void;
}

export interface Handler {
  push(ctx: PushContext, config: any): Promise<any>;
}

export const handlers: Record<string, Handler> = {
  grpc: GrpcHandler,
};
