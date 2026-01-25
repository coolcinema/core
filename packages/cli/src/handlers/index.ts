import { GrpcHandler } from "./grpc";
import { HandlerModule } from "../types";

export const handlers: Record<string, HandlerModule> = {
  grpc: GrpcHandler,
};
