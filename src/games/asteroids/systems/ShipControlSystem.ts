import { System } from "../../../engine/System";
import { World } from "../../../engine";
import { TransformComponent, VelocityComponent, RenderComponent } from "../../../engine/EngineTypes";
import { InputComponent, GAME_CONFIG } from "../types/AsteroidTypes";
import { ShipPhysics } from "../utils/ShipPhysics";
import { hapticShoot } from "../../../utils/haptics";
import { EventBus } from "../../../engine/EventBus";

/**
 * System that applies physical forces and actions based on the ship's input intent.
 */
export class ShipControlSystem extends System {
  constructor(private config: typeof GAME_CONFIG = GAME_CONFIG) {
    super();
  }

  public update(world: World, deltaTime: number): void {
    const ships = world.query("Ship", "Input", "Transform", "Velocity", "Render");

    for (let i = 0; i < ships.length; i++) {
      const entity = ships[i];
      const input = world.getComponent<InputComponent>(entity, "Input")!;
      const pos = world.getComponent<TransformComponent>(entity, "Transform")!;
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity")!;
      const render = world.getComponent<RenderComponent>(entity, "Render")!;

      ShipPhysics.simulateShipTick(
        world,
        pos,
        vel,
        render,
        input,
        deltaTime,
        { isResimulating: false },
        this.config,
        (bullet) => {
          // Listen for TTL destruction (miss)
          const ttl = world.getComponent<import("../../../engine/CoreComponents").TTLComponent>(bullet, "TTL");
          if (ttl) {
            const originalOnComplete = ttl.onComplete;
            ttl.onComplete = () => {
              if (originalOnComplete) originalOnComplete();
              const eventBus = world.getResource<EventBus>("EventBus");
              if (eventBus) eventBus.emit("asteroid:bullet_missed");
            };
          }
          hapticShoot();
        }
      );
    }
  }
}
