import { World } from "../ecs/World";
import { EventBus } from "../events/EventBus";
import { InputSystem } from "../input/InputSystem";
import { GameLoop } from "../loop/GameLoop";

/**
 * Interface representing a runnable game.
 */
export interface IGame<TState = unknown> {
  getWorld(): World<any, any, any>;
  getEventBus(): EventBus<any>;
  getGameLoop(): GameLoop;
  getGameState(): TState;
  isGameOver(): boolean;
  getSeed(): number;
  init(): Promise<void>;
  start(): void;
  pause(): void;
  resume(): void;
  destroy(): void;
  restart(seed?: number): Promise<void>;
  subscribe(callback: (state: TState) => void): () => void;
  isPausedState(): boolean;
  getInputSystem(): InputSystem;
}
