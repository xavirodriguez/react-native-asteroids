import { World } from "../../engine/core/World";
import { BaseGame } from "../../engine/core/BaseGame";
import { MovementSystem } from "../../engine/systems/MovementSystem";
import { CollisionSystem2D as CollisionSystem } from "../../engine/physics/collision/CollisionSystem2D";

type PongState = { score: number };
type PongInput = { up: boolean, down: boolean };

/**
 * Example of how to register a new game (Pong) using the TinyAsterEngine.
 */
export class PongGame extends BaseGame<PongState, PongInput> {
  protected registerSystems(): void {
    this.world.addSystem(new MovementSystem());
    this.world.addSystem(new class extends import("../../engine/core/System").System {
      public override update(_world: World, _deltaTime: number): void {
        console.log("Pong collision!");
      }
    });
  }

  protected initializeEntities(): void {
    const ball = this.world.createEntity();
    this.world.addComponent(ball, { type: "Transform", x: 400, y: 300 });
    this.world.addComponent(ball, { type: "Velocity", dx: 100, dy: 100 });
    this.world.addComponent(ball, { type: "Render", shape: "circle", size: 10, color: "white", rotation: 0 });
    this.world.addComponent(ball, { type: "Collider", radius: 10 });
  }

  public getGameState(): PongState { return { score: 0 }; }
  public isGameOver(): boolean { return false; }
}
