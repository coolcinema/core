import { GrpcHandler } from "./grpc";
import { HandlerModule } from "../types";
import { IngressHandler } from "./ingress";

export const handlers: Record<string, HandlerModule> = {
  grpc: GrpcHandler,
  ingress: IngressHandler,
};
