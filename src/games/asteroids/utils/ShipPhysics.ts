import { World } from "../../../engine/core/World";
import { TransformComponent, VelocityComponent, RenderComponent } from "../../../engine/types/EngineTypes";
import { InputComponent, GAME_CONFIG } from "../types/AsteroidTypes";
import { PhysicsUtils } from "../../../engine/physics/utils/PhysicsUtils";
import { RandomService } from "../../../engine/utils/RandomService";
import { createParticle, createBullet } from "../EntityFactory";
import { SimulationContext } from "../../../simulation/DeterministicSimulation";
import { EventBus } from "../../../engine/core/EventBus";
import { ModifierStackComponent } from "../../../engine/core/CoreComponents";

/**
 * Shared logic for ship movement and physics application.
 * Can be used by both the client and server/prediction.
 */
export const ShipPhysics = {
  applyRotation(world: World, entity: number, pos: TransformComponent, input: InputComponent, dtSeconds: number, config: typeof GAME_CONFIG = GAME_CONFIG): void {
    const modifiers = world.getComponent<ModifierStackComponent>(entity, "ModifierStack")?.modifiers || [];
    const speedMod = modifiers.find(m => m.type === "speed");
    const rotationMultiplier = speedMod ? 1.5 : 1.0;

    if (input.rotateLeft) {
      world.mutateComponent(entity, "Transform", (t: TransformComponent) => {
        t.rotation -= config.SHIP_ROTATION_SPEED * rotationMultiplier * dtSeconds;
        t.dirty = true;
      });
    }
    if (input.rotateRight) {
      world.mutateComponent(entity, "Transform", (t: TransformComponent) => {
        t.rotation += config.SHIP_ROTATION_SPEED * rotationMultiplier * dtSeconds;
        t.dirty = true;
      });
    }
  },

  applyThrust(world: World, entity: number, position: TransformComponent, velocity: VelocityComponent, input: InputComponent, dtSeconds: number, ctx?: SimulationContext, config: typeof GAME_CONFIG = GAME_CONFIG): void {
    if (input.thrust) {
      const modifiers = world.getComponent<ModifierStackComponent>(entity, "ModifierStack")?.modifiers || [];
      const speedMod = modifiers.find(m => m.type === "speed");
      const thrustMultiplier = speedMod ? 2.0 : 1.0;

      world.mutateComponent(entity, "Velocity", (v: VelocityComponent) => {
        v.dx += Math.cos(position.rotation) * config.SHIP_THRUST * thrustMultiplier * dtSeconds;
        v.dy += Math.sin(position.rotation) * config.SHIP_THRUST * thrustMultiplier * dtSeconds;
      });

      if (ctx?.isResimulating) return;

      // Particles are visual only, use render random
      const renderRandom = RandomService.getInstance("render");
      const currentSpeed = Math.sqrt(velocity.dx * velocity.dx + velocity.dy * velocity.dy);
      const intensity = Math.min(1.5, 0.5 + currentSpeed / 200);

      const particleCount = Math.floor((3 + Math.floor(renderRandom.next() * 3)) * intensity);
      for (let i = 0; i < particleCount; i++) {
        const angle = position.rotation + Math.PI + (renderRandom.next() - 0.5) * 0.4;
        const speed = (50 + renderRandom.next() * 80) * intensity;

        let color = "#FF8800";
        if (currentSpeed > 200) color = "#44AAFF";
        if (currentSpeed > 350) color = "#FFFFFF";

        createParticle({
          world,
          x: position.x - Math.cos(position.rotation) * 10,
          y: position.y - Math.sin(position.rotation) * 10,
          dx: Math.cos(angle) * speed + velocity.dx * 0.5,
          dy: Math.sin(angle) * speed + velocity.dy * 0.5,
          color: color,
          ttl: 300 + renderRandom.next() * 200,
          size: (1 + renderRandom.next() * 2) * intensity,
        });
      }
    }
  },

  /**
   * Applies hyperspace mechanics.
   */
  triggerHyperspace(world: World, shipEntity: number, _pos: TransformComponent, _input: InputComponent, config: typeof GAME_CONFIG): void {
      const gameplayRandom = RandomService.getInstance("gameplay");
      const newX = gameplayRandom.nextRange(0, config.SCREEN_WIDTH);
      const newY = gameplayRandom.nextRange(0, config.SCREEN_HEIGHT);

      world.mutateComponent(shipEntity, "Transform", (t) => {
          t.x = newX;
          t.y = newY;
      });

      world.mutateComponent(shipEntity, "Input", (i: InputComponent) => {
          i.hyperspaceCooldownRemaining = config.HYPERSPACE_COOLDOWN;
      });

      const eventBus = world.getResource<EventBus>("EventBus");
      if (eventBus) eventBus.emit("ship:hyperspace");
  },

  applyFriction(world: World, entity: number, _velocity: VelocityComponent, dtMs: number, config: typeof GAME_CONFIG = GAME_CONFIG): void {
    world.mutateComponent(entity, "Velocity", (v: VelocityComponent) => {
        PhysicsUtils.applyFriction(v, config.SHIP_FRICTION, dtMs);
    });
  },

  /**
   * Unified ship simulation tick.
   *
   * @remarks
   * Designed to centralize physics and action logic aiming for consistency
   * between ECS systems and network prediction.
   */
  simulateShipTick(
    world: World,
    entity: number,
    pos: TransformComponent,
    vel: VelocityComponent,
    _render: RenderComponent,
    input: InputComponent,
    deltaTime: number,
    ctx?: SimulationContext,
    config: typeof GAME_CONFIG = GAME_CONFIG,
    onShoot?: (bullet: import("../../../engine/core/Entity").Entity) => void
  ): void {
    const dtSeconds = deltaTime / 1000;

    // 1. Movement & Rotation
    this.applyRotation(world, entity, pos, input, dtSeconds, config);
    this.applyThrust(world, entity, pos, vel, input, dtSeconds, ctx, config);
    this.applyFriction(world, entity, vel, deltaTime, config);

    // 2. Integration & Boundary Wrapping (Unified Pipeline)
    world.mutateComponent(entity, "Transform", (t: TransformComponent) => {
        PhysicsUtils.integrateMovement(t, vel, dtSeconds);
        PhysicsUtils.wrapBoundary(t, config.SCREEN_WIDTH, config.SCREEN_HEIGHT);
    });

    // 3. Shooting
    if (input.shootCooldownRemaining > 0) {
      world.mutateComponent(entity, "Input", (i: InputComponent) => {
          i.shootCooldownRemaining -= deltaTime;
      });
    }

    if (input.shoot && input.shootCooldownRemaining <= 0) {
      const modifiers = world.getComponent<ModifierStackComponent>(entity, "ModifierStack")?.modifiers || [];
      const isTripleShot = modifiers.some(m => m.type === "triple_shot");
      const shipComp = world.getComponent<import("../types/AsteroidTypes").ShipComponent>(entity, "Ship");
      const ownerId = shipComp?.sessionId;

      if (isTripleShot) {
        const b1 = createBullet({ world, x: pos.x, y: pos.y, angle: pos.rotation, ownerId });
        const b2 = createBullet({ world, x: pos.x, y: pos.y, angle: pos.rotation - 0.2, ownerId });
        const b3 = createBullet({ world, x: pos.x, y: pos.y, angle: pos.rotation + 0.2, ownerId });
        if (onShoot) { onShoot(b1); onShoot(b2); onShoot(b3); }
      } else {
        const bullet = createBullet({ world, x: pos.x, y: pos.y, angle: pos.rotation, ownerId });
        if (onShoot) onShoot(bullet);
      }

      world.mutateComponent(entity, "Input", (i: InputComponent) => {
          i.shootCooldownRemaining = config.BULLET_SHOOT_COOLDOWN;
      });

      const eventBus = world.getResource<EventBus>("EventBus");
      if (eventBus) eventBus.emit("ship:shoot");
    }
  }
};
