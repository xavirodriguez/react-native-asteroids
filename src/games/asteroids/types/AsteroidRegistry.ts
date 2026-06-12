import { CoreComponentRegistry, CoreEvents } from "@tiny-aster/core";
import {
  GameStateComponent,
  InputComponent,
  UfoComponent
} from "./AsteroidTypes";

/**
 * Registry of all components used in the Asteroids game.
 * Extends the Core registry to include game-specific components.
 */
export interface AsteroidsComponentRegistry extends CoreComponentRegistry {
  GameState: GameStateComponent;
  Input: InputComponent;
  Ufo: UfoComponent;
  // Note: Asteroid, Ship, Bullet, etc., are currently markers or use Transform/Velocity
  // If they had specific data, they would be added here.
  Asteroid: { type: "Asteroid" };
  Ship: { type: "Ship" };
  Bullet: { type: "Bullet" };
  LocalPlayer: { type: "LocalPlayer" };
  RemotePlayer: { type: "RemotePlayer"; sessionId: string };
}

/**
 * Registry of all events used in the Asteroids game.
 */
export interface AsteroidsEventRegistry extends CoreEvents {
  "game:start": { seed: number };
  "game:over": { score: number; level: number };
  "ship:destroyed": { entity: number };
  "asteroid:destroyed": { entity: number; size: "large" | "medium" | "small" };
  "ufo:spawned": { entity: number };
  "score:changed": { newScore: number; delta: number };
}
