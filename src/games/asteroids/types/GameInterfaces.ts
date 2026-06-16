import { World } from "@tiny-aster/core";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "./AsteroidRegistry";

export interface IAsteroidsGame {
  getWorld(): World<AsteroidsComponentRegistry, AsteroidsEventRegistry>;
  getGameState(): any;
  isGameOver(): boolean;
}
