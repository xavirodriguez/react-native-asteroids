import { Room, Client } from "@colyseus/core";
import { Schema, type, MapSchema } from "@colyseus/schema";

class Bird extends Schema {
  @type("number") x: number;
  @type("number") y: number;
}

class FlappyState extends Schema {
  @type({ map: Bird }) birds = new MapSchema<Bird>();
}

export class FlappyBirdRoom extends (Room as any) {
  private random: any;

  onCreate(options: any) {
    this.setState(new FlappyState());
    this.setSimulationInterval((dt: number) => {});
    this.onMessage("jump", (client: Client) => {});
  }

  onJoin(client: Client) {
    this.state.birds.set(client.sessionId, new Bird());
  }

  onLeave(client: Client) {
    this.state.birds.delete(client.sessionId);
  }
}
