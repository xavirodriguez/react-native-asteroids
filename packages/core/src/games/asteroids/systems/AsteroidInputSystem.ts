import { World } from "../../../ecs/World";
import { System } from "../../../ecs/System";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../types/AsteroidRegistry";
import { AsteroidConfig } from "../types/AsteroidConfigSchema";
import { computeShipPhysics } from "../utils/AsteroidPhysics";
import { createBullet } from "../EntityFactory";

/** @public */
export class AsteroidInputSystem extends System<AsteroidsComponentRegistry, AsteroidsEventRegistry> {
  private config: AsteroidConfig;

  constructor(config: AsteroidConfig) {
    super();
    this.config = config;
  }

  public update(world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, deltaTime: number): void {
      const dtSec = deltaTime / 1000;
      const config = world.getResource<AsteroidConfig>("GameConfig") || this.config;

      // Query local player entities
      const entities = world.query("LocalPlayer" as any, "Transform", "Velocity", "Input");

      if (entities.length > 0) {
          world.setResource("LocalPhysicsProcessedThisFrame", true);
      }

      for (const entity of entities) {
          const transform = world.getComponent(entity, "Transform")!;
          const velocity = world.getComponent(entity, "Velocity")!;
          const input = world.getComponent(entity, "Input")!;
          const ship = world.getComponent(entity, "Ship" as any);

          // 1. Process physics (rotation, thrust, friction)
          const phys = computeShipPhysics(
              transform,
              velocity,
              input,
              config,
              dtSec
          );

          world.mutateComponent(entity, "Velocity", (v) => {
              v.vx = phys.vx;
              v.vy = phys.vy;
          });

          world.mutateComponent(entity, "Transform", (t) => {
              t.rotation = phys.rotation;
          });

          // 2. Process shooting
          // Cooldown decrement
          if (ship && (ship as any).shootCooldownRemaining > 0) {
              world.mutateComponent(entity, "Ship" as any, (s: any) => {
                  s.shootCooldownRemaining -= dtSec;
                  if (s.shootCooldownRemaining < 0) s.shootCooldownRemaining = 0;
              });
          }

          const currentShip = world.getComponent(entity, "Ship" as any);
          const cooldown = currentShip ? (currentShip as any).shootCooldownRemaining : 0;

          if (input.shoot && cooldown <= 0) {
              const bulletSpeed = config.BULLET_SPEED ?? 300;
              const vx = velocity.vx + Math.cos(transform.rotation) * bulletSpeed;
              const vy = velocity.vy + Math.sin(transform.rotation) * bulletSpeed;

              createBullet({
                  world,
                  x: transform.x,
                  y: transform.y,
                  vx,
                  vy,
                  ownerId: "player"
              });

              if (world.hasComponent(entity, "Ship" as any)) {
                  world.mutateComponent(entity, "Ship" as any, (s: any) => {
                      s.shootCooldownRemaining = config.SHIP_SHOOT_COOLDOWN ?? 0.25;
                  });
              }
          }

          // 3. Process hyperspace
          if (input.hyperspace) {
              const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") || {
                  width: config.SCREEN_WIDTH ?? 800,
                  height: config.SCREEN_HEIGHT ?? 600
              };
              const rand = world.gameplayRandom;
              const rx = rand.next() * screen.width;
              const ry = rand.next() * screen.height;

              world.mutateComponent(entity, "Transform", (t) => {
                  t.x = rx;
                  t.y = ry;
              });

              world.mutateComponent(entity, "Velocity", (v) => {
                  v.vx = 0;
                  v.vy = 0;
              });

              // Clear the input flag so hyperspace doesn't trigger repeatedly on hold
              world.mutateComponent(entity, "Input", (inp) => {
                  inp.hyperspace = false;
              });
          }
      }
  }

  public onRegister(world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>): void {}
  public dispose(): void {}
}
