import { MapSchema, Schema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") sessionId: string;
  @type("string") name: string;
  @type("number") x: number;
  @type("number") y: number;
  @type("number") angle: number;
  @type("number") score: number;
  @type("number") lives: number;
  @type("boolean") alive: boolean;
  @type("number") velocityX: number;
  @type("number") velocityY: number;
}

export class Asteroid extends Schema {
  @type("string") id: string;
  @type("number") x: number;
  @type("number") y: number;
  @type("number") size: number;
}

export class Bullet extends Schema {
  @type("number") x: number;
  @type("number") y: number;
  @type("string") ownerId: string;
}

export class AsteroidsState extends Schema {
  @type("number") seed: number;
  @type("number") gameWidth: number;
  @type("number") gameHeight: number;
  @type("boolean") gameStarted: boolean;
  @type("boolean") gameOver: boolean;
  @type("number") serverTick: number;
  @type("number") lastProcessedTick: number;
  @type("number") score: number;
  @type("number") protocolVersion: number = 1;
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Asteroid }) asteroids = new MapSchema<Asteroid>();
  @type({ map: Bullet }) bullets = new MapSchema<Bullet>();
  @type("string") fullWorldState: string;
}
