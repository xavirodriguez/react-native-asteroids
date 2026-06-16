import { CoreComponentRegistry, CoreEvents } from "@tiny-aster/core";
import {
  GameStateComponent,
  InputComponent,
  UfoComponent
} from "./AsteroidTypes";

export interface AsteroidsComponentRegistry extends CoreComponentRegistry {
  GameState: GameStateComponent;
  Input: InputComponent;
  Ufo: UfoComponent;
  Asteroid: { type: "Asteroid"; size: string };
  Ship: { type: "Ship"; sessionId: string };
  Bullet: { type: "Bullet"; ownerId?: string };
  LocalPlayer: { type: "LocalPlayer" };
  RemotePlayer: { type: "RemotePlayer"; sessionId: string };
}

export interface AsteroidsEventRegistry extends CoreEvents {
  "game:start": { seed: number };
  "game:over": { score: number; level: number };
  "ship:destroyed": { entity: number };
  "asteroid:destroyed": { entity: number; size: "large" | "medium" | "small" };
  "ufo:spawned": { entity: number };
  "score:changed": { newScore: number; delta: number };
}
