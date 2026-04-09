import { Schema, MapSchema, type } from "@colyseus/schema";

export class EntityState extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") angle: number = 0;
  @type("number") velocityX: number = 0;
  @type("number") velocityY: number = 0;
}

export class Player extends EntityState {
  @type("int8") lives: number = 3;
  @type("uint32") score: number = 0;
  @type("boolean") alive: boolean = true;
  @type("string") sessionId: string = "";
  @type("string") name: string = "";
}

export class Asteroid extends EntityState {
  @type("string") id: string = "";
  @type("int8") size: number = 3; // 1: small, 2: medium, 3: large
}

export class Bullet extends EntityState {
  @type("string") ownerId: string = "";
}

export class AsteroidsState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Asteroid }) asteroids = new MapSchema<Asteroid>();
  @type({ map: Bullet }) bullets = new MapSchema<Bullet>();

  @type("uint32") serverTick: number = 0;
  @type("uint32") lastProcessedTick: number = 0;
  @type("boolean") gameStarted: boolean = false;
  @type("boolean") gameOver: boolean = false;
  @type("number") gameWidth: number = 800;
  @type("number") gameHeight: number = 600;
  @type("uint32") seed: number = 12345;
}

export class Invader extends Schema {
  @type("string") id: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("boolean") alive: boolean = true;
}

export class SpaceInvadersState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Invader }) invaders = new MapSchema<Invader>();
  @type("boolean") gameStarted: boolean = false;
  @type("boolean") gameOver: boolean = false;
}

export class Bird extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") velocityY: number = 0;
  @type("boolean") alive: boolean = true;
}

export class Pipe extends Schema {
  @type("string") id: string = "";
  @type("number") x: number = 0;
  @type("number") gapY: number = 0;
  @type({ map: "boolean" }) scoredBy = new MapSchema<boolean>();
}

export class FlappyBirdState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Pipe }) pipes = new MapSchema<Pipe>();
  @type("boolean") gameStarted: boolean = false;
  @type("boolean") gameOver: boolean = false;
  @type("uint32") seed: number = 12345;
}
