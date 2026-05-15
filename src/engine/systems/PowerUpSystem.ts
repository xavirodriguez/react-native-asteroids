import { System } from "../core/System";
import { World } from "../core/World";
import { PowerUpComponent } from "../types/EngineTypes";
import { EventBus } from "../core/EventBus";

/**
 * System that handles the collection and application of power-ups.
 * Power-ups are collected when a ship collides with them.
 */
export class PowerUpSystem extends System {
  public update(world: World, _deltaTime: number): void {
    const collisions = world.query("CollisionEvents");

    for (const entity of collisions) {
      const eventsComp = world.getComponent<import("../types/EngineTypes").CollisionEventsComponent>(entity, "CollisionEvents");
      if (!eventsComp) continue;

      for (const event of eventsComp.collisions) {
        // We only process each pair once
        if (entity > event.otherEntity) continue;

        this.handleCollision(world, entity, event.otherEntity);
      }
    }
  }

  private handleCollision(world: World, e1: number, e2: number): void {
    const match = this.matchPair(world, e1, e2, "Ship", "PowerUp");
    if (!match) return;

    const shipEntity = match.Ship;
    const powerUpEntity = match.PowerUp;
    const powerUp = world.getComponent<PowerUpComponent>(powerUpEntity, "PowerUp");

    if (powerUp) {
      this.applyPowerUp(world, shipEntity, powerUp, powerUpEntity);
    }
  }

  private applyPowerUp(world: World, shipEntity: number, powerUp: PowerUpComponent, powerUpEntity: number): void {
    const commands = world.getCommandBuffer();

    // Add ModifierStack if missing
    if (!world.hasComponent(shipEntity, "ModifierStack")) {
      commands.addComponent(shipEntity, {
        type: "ModifierStack",
        modifiers: []
      } as import("../core/CoreComponents").ModifierStackComponent);
    }

    // Apply modifier via mutation if stack exists, or queue it
    // For now, we always use mutateComponent which works if the component exists.
    // If it was just added via command buffer, it won't be available until next frame.
    // So we use the CommandBuffer.mutateComponent which is designed for this.
    commands.mutateComponent(shipEntity, "ModifierStack", (stack: import("../core/CoreComponents").ModifierStackComponent) => {
      stack.modifiers.push({
        id: `pw_${powerUp.powerUpType}_${Date.now()}`,
        type: powerUp.powerUpType,
        value: powerUp.value,
        duration: powerUp.duration,
        remaining: powerUp.duration
      });
    });

    const eventBus = world.getResource<EventBus>("EventBus");
    if (eventBus) {
      eventBus.emitDeferred("powerup:collected", { type: powerUp.powerUpType, entity: shipEntity });
    }

    commands.removeEntity(powerUpEntity);
  }

  private matchPair<T1 extends string, T2 extends string>(
    world: World,
    entityA: number,
    entityB: number,
    type1: T1,
    type2: T2
  ): Record<T1 | T2, number> | undefined {
    if (world.hasComponent(entityA, type1) && world.hasComponent(entityB, type2)) {
      return { [type1]: entityA, [type2]: entityB } as Record<T1 | T2, number>;
    }
    if (world.hasComponent(entityB, type1) && world.hasComponent(entityA, type2)) {
      return { [type1]: entityB, [type2]: entityA } as Record<T1 | T2, number>;
    }
    return undefined;
  }
}
