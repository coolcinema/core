import { GrpcHandler } from "./grpc";
import { Handler } from "../types";

export const handlers: Record<string, Handler> = {
  grpc: GrpcHandler,
};

export * from "../types";
