import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { PowerUpComponent, CollisionEventsComponent, ModifierStackComponent } from "../ecs/CoreComponents";
import { EventBus } from "../events/EventBus";

/**
 * System that handles the collection and application of power-ups.
 * Power-ups are collected when a player collides with them.
 */
export class PowerUpSystem extends System {
  public update(world: World, _deltaTime: number): void {
    const collisions = world.query("CollisionEvents");

    for (const entity of collisions) {
      const eventsComp = world.getComponent<CollisionEventsComponent>(entity, "CollisionEvents");
      if (!eventsComp) continue;

      for (const event of eventsComp.collisions) {
        // We only process each pair once
        if (entity > event.otherEntity) continue;

        this.handleCollision(world, entity, event.otherEntity);
      }
    }
  }

  private handleCollision(world: World, e1: number, e2: number): void {
    const match = this.matchPair(world, e1, e2, "Player", "PowerUp");
    if (!match) return;

    const playerEntity = match.Player;
    const powerUpEntity = match.PowerUp;
    const powerUp = world.getComponent<PowerUpComponent>(powerUpEntity, "PowerUp");

    if (powerUp) {
      this.applyPowerUp(world, playerEntity, powerUp, powerUpEntity);
    }
  }

  private applyPowerUp(world: World, playerEntity: number, powerUp: PowerUpComponent, powerUpEntity: number): void {
    const commands = world.getCommandBuffer();

    // Add ModifierStack if missing
    if (!world.hasComponent(playerEntity, "ModifierStack")) {
      commands.addComponent(playerEntity, {
        type: "ModifierStack",
        modifiers: []
      } as ModifierStackComponent);
    }

    // Apply modifier via mutation.
    // CommandBuffer.mutateComponent handles cases where the component was just added.
    commands.mutateComponent<ModifierStackComponent>(playerEntity, "ModifierStack", (stack) => {
      stack.modifiers.push({
        id: `pw_${powerUp.powerUpType}_${world.tick}_${playerEntity}`,
        type: powerUp.powerUpType,
        value: powerUp.value,
        duration: powerUp.duration,
        remaining: powerUp.duration
      });
    });

    const eventBus = world.getResource<EventBus>("EventBus");
    if (eventBus) {
      eventBus.emitDeferred("powerup:collected", { type: powerUp.powerUpType, entity: playerEntity });
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
