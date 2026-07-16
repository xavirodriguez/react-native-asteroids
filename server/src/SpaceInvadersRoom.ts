import { Room, Client } from "@colyseus/core";
import { Schema, type, MapSchema } from "@colyseus/schema";
import { z } from "zod";

const RoomOptionsSchema = z.object({
  seed: z.number().int().optional()
});

const JoinOptionsSchema = z.object({
  name: z.string().max(32).optional()
});

class Invader extends Schema {
  @type("number") x: number;
  @type("number") y: number;
}

class SpaceInvadersState extends Schema {
  @type({ map: Invader }) invaders = new MapSchema<Invader>();
}

export class SpaceInvadersRoom extends (Room as any) {
  onCreate(options: any) {
    const parsedOptions = RoomOptionsSchema.safeParse(options);
    const _validOptions = parsedOptions.success ? parsedOptions.data : {};

    this.setState(new SpaceInvadersState());
    this.setSimulationInterval((dt: number) => {});
    this.onMessage("move", (client: Client, data: any) => {});
  }
  onJoin(client: Client, options: any) {
    const parsedOptions = JoinOptionsSchema.safeParse(options);
    const _validOptions = parsedOptions.success ? parsedOptions.data : {};
  }
  onLeave(client: Client) {}
}
