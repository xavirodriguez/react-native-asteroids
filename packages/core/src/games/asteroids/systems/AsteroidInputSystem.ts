import { World } from "../../../ecs/World";
import { System } from "../../../ecs/System";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../types/AsteroidRegistry";
import { BulletPool, ParticlePool } from "../EntityPool";
import { AsteroidConfig } from "../types/AsteroidConfigSchema";
import { computeShipPhysics, getDeltaInSeconds } from "./ShipPhysics";
import { createBullet } from "../EntityFactory";

/** @public */
export class AsteroidInputSystem extends System<AsteroidsComponentRegistry, AsteroidsEventRegistry> {
  private bulletPool: BulletPool;
  private particlePool: ParticlePool;
  private config: AsteroidConfig;
  private shootCooldown = 0;
  private hyperspaceCooldown = 0;

  constructor(bulletPool: BulletPool, particlePool: ParticlePool, config: AsteroidConfig) {
    super();
    this.bulletPool = bulletPool;
    this.particlePool = particlePool;
    this.config = config;
  }

  public update(world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, deltaTime: number): void {
    if (this.shootCooldown > 0) {
      this.shootCooldown -= deltaTime;
    }
    if (this.hyperspaceCooldown > 0) {
      this.hyperspaceCooldown -= deltaTime;
    }

    const localPlayers = world.query("LocalPlayer", "Input", "Transform", "Velocity");
    const width = this.config.SCREEN_WIDTH ?? 800;
    const height = this.config.SCREEN_HEIGHT ?? 600;

    for (const entity of localPlayers) {
      const input = world.getComponent(entity, "Input");
      const transform = world.getComponent(entity, "Transform");
      const velocity = world.getComponent(entity, "Velocity");

      if (!input || !transform || !velocity) continue;

      // Update physics
      const dtSec = getDeltaInSeconds(deltaTime);
      const phys = computeShipPhysics(
        transform.rotation,
        {
          rotateLeft: input.rotateLeft,
          rotateRight: input.rotateRight,
          thrust: input.thrust
        },
        this.config as any,
        dtSec
      );

      world.mutateComponent(entity, "Velocity", (v) => {
        v.vx += phys.dvx;
        v.vy += phys.dvy;
        let angularVel = 0;
        if (input.rotateLeft) angularVel -= (this.config as any).SHIP_ROTATION_SPEED;
        if (input.rotateRight) angularVel += (this.config as any).SHIP_ROTATION_SPEED;
        v.angularVelocity = angularVel;
      });

      world.mutateComponent(entity, "Transform", (t) => {
        t.rotation += phys.dRotation;
      });

      // Handle Hyperspace
      if (input.hyperspace && this.hyperspaceCooldown <= 0) {
        this.hyperspaceCooldown = 1.0; // 1 second cooldown
        world.mutateComponent(entity, "Transform", (t) => {
          t.x = world.gameplayRandom.next() * width;
          t.y = world.gameplayRandom.next() * height;
        });
        world.mutateComponent(entity, "Velocity", (v) => {
          v.vx = 0;
          v.vy = 0;
        });
      }

      // Handle Shooting
      if (input.shoot && this.shootCooldown <= 0) {
        this.shootCooldown = 0.25; // 250ms shoot cooldown
        const bulletSpeed = (this.config as any).BULLET_SPEED ?? 300;
        const bulletLifetime = (this.config as any).BULLET_LIFETIME ?? 2.0;

        // Offset spawn position so it doesn't overlap/spawn inside center of the ship
        const bulletX = transform.x + Math.cos(transform.rotation) * 15;
        const bulletY = transform.y + Math.sin(transform.rotation) * 15;

        // Bullet velocity = ship velocity + bullet speed in nose direction
        const bulletVx = velocity.vx + Math.cos(transform.rotation) * bulletSpeed;
        const bulletVy = velocity.vy + Math.sin(transform.rotation) * bulletSpeed;

        createBullet({
          world,
          x: bulletX,
          y: bulletY,
          vx: bulletVx,
          vy: bulletVy,
          ownerId: String(entity),
          lifetime: bulletLifetime
        });
      }
    }
  }

  public onRegister(world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>): void {}
  public dispose(): void {}
}
