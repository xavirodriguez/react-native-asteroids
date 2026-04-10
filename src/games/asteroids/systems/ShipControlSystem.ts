import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { TransformComponent, VelocityComponent, RenderComponent, Entity } from "../../../engine/types/EngineTypes";
import { InputComponent, GAME_CONFIG } from "../types/AsteroidTypes";
import { ActiveWeaponComponent } from "../types/WeaponTypes";
import { ShipPhysics } from "../utils/ShipPhysics";
import { createBullet } from "../EntityFactory";
import { hapticShoot } from "../../../utils/haptics";
import { EventBus } from "../../../engine/core/EventBus";

/**
 * System that applies physical forces and actions based on the ship's input intent.
 */
export class ShipControlSystem extends System {
  constructor(private config: typeof GAME_CONFIG = GAME_CONFIG) {
    super();
  }

  public update(world: World, deltaTime: number): void {
    const ships = world.query("Ship", "Input", "Transform", "Velocity", "Render");
    const dtSeconds = deltaTime / 1000;

    ships.forEach(entity => {
      const input = world.getComponent<InputComponent>(entity, "Input")!;
      const pos = world.getComponent<TransformComponent>(entity, "Transform")!;
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity")!;
      const render = world.getComponent<RenderComponent>(entity, "Render")!;

      // 1. Apply movement
      ShipPhysics.applyRotation(render, input, dtSeconds, this.config);
      ShipPhysics.applyThrust(world, pos, vel, render, input, dtSeconds, this.config);
      ShipPhysics.applyFriction(vel, deltaTime, this.config);

      // Handle Thruster Particles
      if (input.thrust) {
        const rotation = render.rotation;
        const thrusterX = pos.x - Math.cos(rotation) * 12;
        const thrusterY = pos.y - Math.sin(rotation) * 12;

        const speed = Math.sqrt(vel.dx * vel.dx + vel.dy * vel.dy);
        const colors = ["#4488FF", "#88AAFF"];
        if (speed >= 50) colors.push("#FFFFFF");
        if (speed >= 150) colors.push("#FFEEAA");

        const { createEmitter } = require("../../../engine/systems/ParticleSystem");
        createEmitter(world, {
          position: { x: thrusterX, y: thrusterY },
          rate: 0,
          burst: 3,
          lifetime: { min: 0.1, max: 0.3 },
          speed: { min: 20, max: 80 },
          angle: {
            min: (rotation + Math.PI) * (180 / Math.PI) - 25,
            max: (rotation + Math.PI) * (180 / Math.PI) + 25
          },
          size: { min: 1, max: 3 },
          color: colors,
          loop: false
        });
      }

      // 2. Handle Shooting
      if (input.shootCooldownRemaining > 0) {
        input.shootCooldownRemaining -= deltaTime;
      }

      if (input.shoot && input.shootCooldownRemaining <= 0) {
        const bullet = createBullet({ world, x: pos.x, y: pos.y, angle: render.rotation });

        // Listen for TTL destruction (miss)
        const ttl = world.getComponent<any>(bullet, "TTL");
        if (ttl) {
          const originalOnComplete = ttl.onComplete;
          ttl.onComplete = () => {
            if (originalOnComplete) originalOnComplete();
            const eventBus = world.getResource<EventBus>("EventBus");
            if (eventBus) eventBus.emit("asteroid:bullet_missed");
          };
        }

        input.shootCooldownRemaining = this.config.BULLET_SHOOT_COOLDOWN;
        hapticShoot();
      }
    });
  }
}
