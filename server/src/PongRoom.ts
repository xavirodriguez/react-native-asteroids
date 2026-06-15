import { Room, Client } from "@colyseus/core";
import { Schema, type } from "@colyseus/schema";

class PongState extends Schema {
  @type("number") ballX: number;
  @type("number") ballY: number;
}

export class PongRoom extends (Room as any) {
  onCreate() {
    this.setState(new PongState());
    this.onMessage("move", (client: Client, data: any) => {});
  }
  onJoin(client: Client) {}
  onLeave(client: Client) {}
}
