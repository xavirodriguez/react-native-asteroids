import { BaseGame } from "../../engine/BaseGame";
import { MovementSystem } from "../../engine/systems/generic/MovementSystem";
import { PhysicsSystem } from "../../engine/systems/generic/PhysicsSystem";
import { CollisionSystem } from "../../engine/systems/generic/CollisionSystem";
import { World } from "../../engine/core/World";
import { GAME_CONFIG } from "../../types/GameTypes";

/**
 * Minimal Pong implementation to demonstrate engine extensibility.
 * < 50 lines of code.
 */
export class PongGame extends BaseGame {
  constructor() {
    super();
    this.registerSystems();
    this.initializeEntities();
  }

  protected registerSystems(): void {
    this.world.addSystem(new PhysicsSystem({ friction: 1.0, gravity: 0 }));
    this.world.addSystem(new MovementSystem({
      wrap: false,
      bounds: { width: GAME_CONFIG.SCREEN_WIDTH, height: GAME_CONFIG.SCREEN_HEIGHT }
    }));
    this.world.addSystem(new CollisionSystem(this.eventBus));
  }

  protected initializeEntities(): void {
    this.createPaddle(50); // Left
    this.createPaddle(GAME_CONFIG.SCREEN_WIDTH - 50); // Right
    this.createBall();
  }

  private createPaddle(x: number): void {
    const e = this.world.createEntity();
    this.world.addComponent(e, { type: "Position", x, y: 300 });
    this.world.addComponent(e, { type: "Velocity", dx: 0, dy: 0 });
    this.world.addComponent(e, { type: "Render", shape: "line", size: 60, color: "white", rotation: Math.PI / 2 });
    this.world.addComponent(e, { type: "Collider", radius: 30 });
  }

  private createBall(): void {
    const e = this.world.createEntity();
    this.world.addComponent(e, { type: "Position", x: 400, y: 300 });
    this.world.addComponent(e, { type: "Velocity", dx: 200, dy: 150 });
    this.world.addComponent(e, { type: "Render", shape: "circle", size: 10, color: "white", rotation: 0 });
    this.world.addComponent(e, { type: "Collider", radius: 5 });
  }
}
