import { World, System } from "@tiny-aster/core";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../types/AsteroidRegistry";
import { BulletPool, ParticlePool } from "../EntityPool";
import { AsteroidConfig } from "../types/AsteroidConfigSchema";

export class AsteroidInputSystem extends System<AsteroidsComponentRegistry, AsteroidsEventRegistry> {
  constructor(bulletPool: BulletPool, particlePool: ParticlePool, config: AsteroidConfig) {
    super();
  }

  public update(world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, deltaTime: number): void {
      // Input handling logic
  }
  public onRegister(world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>): void {}
  public dispose(): void {}
}
