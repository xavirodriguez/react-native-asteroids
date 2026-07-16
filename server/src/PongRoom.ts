import { Room, Client } from "@colyseus/core";
import { Schema, type } from "@colyseus/schema";
import { z } from "zod";

const RoomOptionsSchema = z.object({
  seed: z.number().int().optional()
});

const JoinOptionsSchema = z.object({
  name: z.string().max(32).optional()
});

class PongState extends Schema {
  @type("number") ballX: number;
  @type("number") ballY: number;
}

export class PongRoom extends (Room as any) {
  onCreate(options: any) {
    const parsedOptions = RoomOptionsSchema.safeParse(options);
    const _validOptions = parsedOptions.success ? parsedOptions.data : {};

    this.setState(new PongState());
    this.onMessage("move", (client: Client, data: any) => {});
  }
  onJoin(client: Client, options: any) {
    const parsedOptions = JoinOptionsSchema.safeParse(options);
    const _validOptions = parsedOptions.success ? parsedOptions.data : {};
  }
  onLeave(client: Client) {}
}
