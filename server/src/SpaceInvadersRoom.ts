import { Room, Client } from "@colyseus/core";
import { Schema, type, MapSchema } from "@colyseus/schema";

class Invader extends Schema {
  @type("number") x: number;
  @type("number") y: number;
}

class SpaceInvadersState extends Schema {
  @type({ map: Invader }) invaders = new MapSchema<Invader>();
}

export class SpaceInvadersRoom extends (Room as any) {
  onCreate() {
    this.setState(new SpaceInvadersState());
    this.setSimulationInterval((dt: number) => {});
    this.onMessage("move", (client: Client, data: any) => {});
  }
  onJoin(client: Client) {}
  onLeave(client: Client) {}
}
