import { World } from "../ecs/World";
import { System } from "../ecs/System";
import { BaseGame } from "../runtime/BaseGame";
import { ComponentRegistry } from "../ecs/Component";
import { EventRegistry } from "../events/EventBus";

export abstract class BaseGameStateSystem<
  TGameState = any,
  TComponents extends ComponentRegistry = any,
  TEvents extends EventRegistry = any
> extends System<TComponents, TEvents> {
  protected _world?: World<TComponents, TEvents>;

  constructor(protected game: BaseGame<TComponents, TEvents>) {
    super();
  }

  public onRegister(world: World<TComponents, TEvents>): void {
    this._world = world;
  }

  public update(world: World<TComponents, TEvents>, deltaTime: number): void {
    const gameState = this.getGameState(world);
    if (!gameState) return;

    if ((gameState as any).isGameOver) return;

    this.updateGameState(world, gameState, deltaTime);

    if (this.evaluateGameOverCondition(gameState)) {
      (gameState as any).isGameOver = true;
      world.getEventBus().emit("game:over" as any, { state: gameState } as any);
    }
  }

  protected abstract getGameState(world: World<TComponents, TEvents>): TGameState | undefined;
  protected abstract updateGameState(world: World<TComponents, TEvents>, gameState: TGameState, deltaTime: number): void;
  protected abstract evaluateGameOverCondition(gameState: TGameState): boolean;

  public abstract resetGameOverState(world?: World<TComponents, TEvents>): void;
}
