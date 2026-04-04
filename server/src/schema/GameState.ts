import { Schema, MapSchema, type } from "@colyseus/schema";

export class Bullet extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") velocityX: number = 0;
  @type("number") velocityY: number = 0;
  @type("string") ownerId: string = "";
}

export class Asteroid extends Schema {
  @type("string") id: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") velocityX: number = 0;
  @type("number") velocityY: number = 0;
  @type("number") size: number = 3;
}

export class Player extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") angle: number = 0;
  @type("number") velocityX: number = 0;
  @type("number") velocityY: number = 0;
  @type("number") score: number = 0;
  @type("number") lives: number = 3;
  @type("boolean") alive: boolean = true;
  @type("string") name: string = "";
}

export class AsteroidsState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Asteroid }) asteroids = new MapSchema<Asteroid>();
  @type({ map: Bullet }) bullets = new MapSchema<Bullet>();
  @type("number") gameWidth: number = 800;
  @type("number") gameHeight: number = 600;
  @type("boolean") gameStarted: boolean = false;
  @type("boolean") gameOver: boolean = false;
  @type("string") winnerId: string = "";
}

// --- Space Invaders ---

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

// --- Flappy Bird ---

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
}
