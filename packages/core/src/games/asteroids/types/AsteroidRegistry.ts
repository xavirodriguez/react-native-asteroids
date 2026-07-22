import { CoreComponentRegistry } from "../../../ecs/CoreComponents";
import { CoreEvents } from "../../../events/EventBus";
import {
  GameStateComponent,
  InputComponent,
  UfoComponent
} from "./AsteroidTypes";

import { LootTableComponent, PowerUpComponent } from "../../arcade/types/ArcadeTypes";

/** @public */
export interface AsteroidsComponentRegistry extends CoreComponentRegistry {
  LootTable: LootTableComponent;
  PowerUp: PowerUpComponent;
  GameState: GameStateComponent;
  Input: InputComponent;
  Ufo: UfoComponent;
  Asteroid: { type: "Asteroid"; size: string };
  Ship: { type: "Ship"; sessionId: string };
  Bullet: { type: "Bullet"; ownerId?: string };
  LocalPlayer: { type: "LocalPlayer" };
  RemotePlayer: { type: "RemotePlayer"; sessionId: string };
  Invulnerable: { type: "Invulnerable" };
}

/** @public */
export interface AsteroidsEventRegistry extends CoreEvents, Record<string, unknown> {
  "game:start": { seed: number };
  "game:over": { score: number; level: number };
  "ship:destroyed": { entity: number };
  "asteroid:destroyed": { entity: number; size: "large" | "medium" | "small" };
  "ufo:spawned": { entity: number };
  "score:changed": { newScore: number; delta: number };
}
