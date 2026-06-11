import { System } from "@tiny-aster/core";
import { World } from "@tiny-aster/core";
import { TransformComponent, VelocityComponent, RenderComponent } from "@tiny-aster/core";
import { InputComponent } from "../types/AsteroidTypes";
import { ShipPhysics } from "../utils/ShipPhysics";
import { AsteroidConfig } from "../types/AsteroidConfigSchema";
import { hapticShoot } from "../../../utils/haptics";
import { EventBus } from "@tiny-aster/core";

/**
 * System that applies physical forces and actions based on the ship's input intent.
 */
export class ShipControlSystem extends System {
  constructor(private config?: AsteroidConfig) {
    super();
  }

  public update(world: World, deltaTime: number): void {
    if (!this.config) {
        this.config = world.getResource<AsteroidConfig>("GameConfig")!;
    }
    const ships = world.query("Ship", "Input", "Transform", "Velocity", "Render");

    for (let i = 0; i < ships.length; i++) {
      const entity = ships[i];
      const input = world.getComponent<InputComponent>(entity, "Input")!;
      const pos = world.getComponent<TransformComponent>(entity, "Transform")!;
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity")!;
      const render = world.getComponent<RenderComponent>(entity, "Render")!;

      ShipPhysics.simulateShipTick(
        world,
        entity,
        pos,
        vel,
        render,
        input,
        deltaTime,
        { isResimulating: false },
        this.config,
        (bullet) => {
          // Listen for TTL destruction (miss)
          world.mutateComponent<import("@tiny-aster/core").TTLComponent>(bullet, "TTL", (ttl) => {
              const originalOnComplete = ttl.onComplete;
              ttl.onComplete = () => {
                if (originalOnComplete) originalOnComplete();
                const eventBus = world.getResource<EventBus>("EventBus");
                if (eventBus) eventBus.emitDeferred("asteroid:bullet_missed");
              };
          });
          hapticShoot();
        }
      );
    }
  }
}
