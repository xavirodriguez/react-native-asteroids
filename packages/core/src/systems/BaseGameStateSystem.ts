import { World } from "../ecs/World";
import { System } from "../ecs/System";
import { BaseGame } from "../runtime/BaseGame";
import { ComponentRegistry } from "../ecs/Component";

export abstract class BaseGameStateSystem<
  TGameState = any,
  TComponents extends ComponentRegistry = any
> extends System<TComponents> {
  protected _world?: World<TComponents>;

  constructor(protected game: BaseGame<TComponents>) {
    super();
  }

  public onRegister(world: World<TComponents>): void {
    this._world = world;
  }

  public update(world: World<TComponents>, deltaTime: number): void {
    const gameState = this.getGameState(world);
    if (!gameState) return;

    if ((gameState as any).isGameOver) return;

    this.updateGameState(world, gameState, deltaTime);

    if (this.evaluateGameOverCondition(gameState)) {
      (gameState as any).isGameOver = true;
      world.getEventBus().emit("game:over" as any, { state: gameState });
    }
  }

  protected abstract getGameState(world: World<TComponents>): TGameState | undefined;
  protected abstract updateGameState(world: World<TComponents>, gameState: TGameState, deltaTime: number): void;
  protected abstract evaluateGameOverCondition(gameState: TGameState): boolean;

  public abstract resetGameOverState(world?: World<TComponents>): void;
}
