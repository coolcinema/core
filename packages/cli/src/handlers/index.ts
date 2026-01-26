import { GrpcHandler } from "./grpc.handler";
import { IngressHandler } from "./ingress.handler";
import { HandlerModule } from "../types";

export const handlers: Record<string, HandlerModule> = {
  grpc: new GrpcHandler(),
  ingress: new IngressHandler(),
};
