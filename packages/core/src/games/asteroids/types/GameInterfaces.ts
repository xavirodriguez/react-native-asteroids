import { World } from "../../../ecs/World";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "./AsteroidRegistry";
import { InputState } from "./AsteroidTypes";

export interface IAsteroidsGame {
  getWorld(): World<AsteroidsComponentRegistry, AsteroidsEventRegistry>;
  getGameState(): any;
  isGameOver(): boolean;
  setInputState(input: Partial<InputState>): void;
}
