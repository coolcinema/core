import { GrpcHandler } from "./grpc.handler";
import { IngressHandler } from "./ingress.handler";
import { HandlerModule } from "../types";
import { HttpHandler } from "./http.handler";
import { EventsHandler } from "./events.handler";

export const handlers: Record<string, HandlerModule> = {
  grpc: new GrpcHandler(),
  ingress: new IngressHandler(),
  http: new HttpHandler(),
  events: new EventsHandler(),
};
