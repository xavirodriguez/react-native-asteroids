/**
 * System that manages the collection and application of power-up effects.
 *
 * This system monitors collision events between entities marked as "PowerUp"
 * and other entities. When a collision occurs, it applies the corresponding
 * `Modifier` to the collector and destroys the power-up entity.
 *
 * @packageDocumentation
 */

import { System } from "../core/System";
import { World } from "../core/World";
import { CollisionEventsComponent, PowerUpComponent, ModifierStackComponent, Modifier } from "../core/CoreComponents";
import { EventBus } from "../core/EventBus";

/**
 * Coordinates the logic for collecting power-ups and applying their buffs.
 */
export class PowerUpSystem extends System {
  /**
   * Scans for collisions involving PowerUp entities.
   */
  public update(world: World, _deltaTime: number): void {
    const powerUps = world.query("PowerUp", "CollisionEvents");

    for (const entity of powerUps) {
      const events = world.getComponent<CollisionEventsComponent>(entity, "CollisionEvents");
      if (!events) continue;

      for (const other of events.triggersEntered) {
        // Only ships can collect power-ups
        if (world.hasComponent(other, "Ship")) {
          this.collectPowerUp(world, entity, other);
          break; // Entity destroyed, stop processing collisions for it
        }
      }
    }
  }

  private collectPowerUp(world: World, powerUpEntity: number, shipEntity: number): void {
    const powerUp = world.getComponent<PowerUpComponent>(powerUpEntity, "PowerUp");
    if (!powerUp) return;

    // Ensure ship has a ModifierStack
    if (!world.hasComponent(shipEntity, "ModifierStack")) {
      world.addComponent(shipEntity, {
        type: "ModifierStack",
        modifiers: []
      } as ModifierStackComponent);
    }

    // Apply the modifier
    world.mutateComponent(shipEntity, "ModifierStack", (stack: ModifierStackComponent) => {
      const modifier: Modifier = {
        id: `powerup_${powerUp.powerUpType}_${Date.now()}`,
        type: powerUp.powerUpType,
        value: powerUp.value,
        duration: powerUp.duration,
        remaining: powerUp.duration
      };
      stack.modifiers.push(modifier);
    });

    // Notify collection
    const eventBus = world.getResource<EventBus>("EventBus");
    if (eventBus) {
      eventBus.emit("powerup:collected", { type: powerUp.powerUpType, entity: shipEntity });
    }

    // Remove the power-up entity
    world.removeEntity(powerUpEntity);
  }
}
