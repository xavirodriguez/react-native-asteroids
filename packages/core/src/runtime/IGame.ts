import { World } from "../ecs/World";
import { EventBus } from "../events/EventBus";
import { UnifiedInputSystem } from "../input/UnifiedInputSystem";

/**
 * Interface representing a runnable game.
 */
export interface IGame<TState = unknown> {
  getWorld(): World<any, any, any>;
  getEventBus(): EventBus<any>;
  getGameState(): TState;
  isGameOver(): boolean;
  init(): Promise<void>;
  start(): void;
  pause(): void;
  resume(): void;
  destroy(): void;
  restart(seed?: number): Promise<void>;
  subscribe(callback: (state: TState) => void): () => void;
  isPausedState(): boolean;
  getInputSystem(): UnifiedInputSystem;
}
