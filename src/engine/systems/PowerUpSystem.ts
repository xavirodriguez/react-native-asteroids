import { System } from "../core/System";
import { World } from "../core/World";
import { CollisionEventsComponent, PowerUpComponent, ModifierStackComponent, Modifier } from "../core/CoreComponents";
import { EventBus } from "../core/EventBus";

/**
 * System that manages power-up collection and effect application.
 */
export class PowerUpSystem extends System {
  public update(world: World, _deltaTime: number): void {
    const powerUps = world.query("PowerUp", "CollisionEvents");

    for (const entity of powerUps) {
      const events = world.getComponent<CollisionEventsComponent>(entity, "CollisionEvents");
      if (!events) continue;

      for (const collision of events.collisions) {
        const other = collision.otherEntity;

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
        modifiers: [{
          id: `powerup_${powerUp.powerUpType}_${Date.now()}`,
          type: powerUp.powerUpType,
          value: powerUp.value,
          duration: powerUp.duration,
          remaining: powerUp.duration
        }]
      } as ModifierStackComponent);
    } else {
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
    }

    // Notify collection
    const eventBus = world.getResource<EventBus>("EventBus");
    if (eventBus) {
      eventBus.emit("powerup:collected", { type: powerUp.powerUpType, entity: shipEntity });
    }

    // Remove the power-up entity
    world.removeEntity(powerUpEntity);
  }
}
