import { Schema, type, MapSchema } from "@colyseus/schema";

export class EntityState extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") angle: number = 0;
  @type("string") type: string = "";
  @type("number") radius: number = 0;
}

export class GameState extends Schema {
  @type({ map: EntityState }) entities = new MapSchema<EntityState>();
  @type("uint32") score: number = 0;
  @type("uint8") lives: number = 3;
  @type("uint8") level: number = 1;
  @type("boolean") isGameOver: boolean = false;
}
