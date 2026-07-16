import { World } from "../../../ecs/World";
import { System } from "../../../ecs/System";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../types/AsteroidRegistry";
import { ParticlePool } from "../EntityPool";

/** @public */
export class AsteroidCollisionSystem extends System<AsteroidsComponentRegistry, AsteroidsEventRegistry> {
  constructor(particlePool: ParticlePool) {
    super();
  }

  public update(world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, deltaTime: number): void {
      // Collision resolution logic
  }
  public onRegister(world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>): void {}
  public dispose(): void {}
}
