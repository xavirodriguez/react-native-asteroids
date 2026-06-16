import { World } from "../ecs/World";
import { EventBus } from "../events/EventBus";

export interface IGame<_T = any> {
  getWorld(): World<any, any, any>;
  getEventBus(): EventBus<any>;
  getGameState(): any;
  isGameOver(): boolean;
  init?(): Promise<void>;
  start?(): void;
  pause?(): void;
  resume?(): void;
  destroy?(): void;
  restart?(): void;
  subscribe?(callback: (state: any) => void): () => void;
  isPausedState?(): boolean;
  getInputSystem?(): any;
}
