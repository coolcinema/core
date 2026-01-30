import { ICommand } from "./base.command";
import { GenGrpcCommand } from "./gen-grpc.command";
import { GenHttpCommand } from "./gen-http.command";
import { GenEventsCommand } from "./gen-events.command";

export class GenCommand implements ICommand {
  async execute() {
    // Можно запустить просто `buf generate` (без путей), тогда сгенерируется всё разом
    // Но мы хотим еще и HTTP клиент
    await new GenGrpcCommand().execute();
    await new GenEventsCommand().execute();
    await new GenHttpCommand().execute();
  }
}
