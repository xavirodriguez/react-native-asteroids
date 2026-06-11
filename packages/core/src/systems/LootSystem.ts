/**
 * Loot Generation System - Item spawning upon entity destruction.
 */

import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { Entity } from "../ecs/Entity";
import { EventBus } from "../events/EventBus";
import { LootTableComponent, TransformComponent, VelocityComponent, RenderComponent, Collider2DComponent, TTLComponent, PowerUpComponent, BoundaryComponent } from "../ecs/CoreComponents";
import { RandomService } from "../utils/RandomService";
import { ScreenConfig } from "../math/CommonTypes";
import { layer, maskOf } from "../physics/collision/CollisionLayers";

/**
 * Coordinates loot generation based on entity destruction events.
 *
 * @public
 */
export class LootSystem extends System {
  private _unsubs: (() => void)[] = [];

  constructor() {
    super();
  }

  public onRegister(world: World): void {
    const eventBus = world.getEventBus();
    if (eventBus) {
      const entityDestroyedHandler = (payload: any) => {
        this.handleEntityDestruction(world, payload.entity);
      };
      this._unsubs.push(eventBus.on("entity:destroyed" as any, entityDestroyedHandler));

      const objectDestroyedHandler = (payload: any) => {
        if (payload.entity !== undefined) {
           this.handleEntityDestruction(world, payload.entity);
        }
      };
      this._unsubs.push(eventBus.on("game:object_destroyed" as any, objectDestroyedHandler));
    }
  }

  public onUnregister(_world: World): void {
    this._unsubs.forEach(unsub => unsub());
    this._unsubs = [];
  }

  public update(_world: World, _deltaTime: number): void {
    // No-op: logic is event-driven
  }

  private handleEntityDestruction(world: World, entity: Entity): void {
    const loot = world.getComponent<LootTableComponent>(entity, "LootTable");
    const transform = world.getComponent<TransformComponent>(entity, "Transform");

    if (!loot || !transform) return;

    const random = world.gameplayRandom;

    for (const drop of loot.drops) {
      if (random.chance(drop.chance)) {
        // Use a deferred event for side-effects like spawning loot from an event handler
        // or just ensure spawnPowerUp uses CommandBuffer (which it already does).
        // Since handleEntityDestruction is called from an event handler, and we want
        // to be absolutely sure, we'll keep spawnPowerUp using the CommandBuffer.
        this.spawnPowerUp(world, transform.x, transform.y, drop);
      }
    }
  }

  private spawnPowerUp(world: World, x: number, y: number, drop: { type: string, config?: { value?: number, duration?: number } }): void {
    const commands = world.getCommandBuffer();
    const rng = world.getResource<RandomService>("gameplay")!;
    const vx = (rng.next() - 0.5) * 50;
    const vy = (rng.next() - 0.5) * 50;

    const screen = world.getResource<ScreenConfig>("ScreenConfig");
    const viewport = {
      width: screen?.width ?? 800,
      height: screen?.height ?? 600
    };

    const powerUp = commands.createEntity();
    // Physical presence
    commands.addComponent(powerUp, {
          type: "Transform",
          x, y, rotation: 0, scaleX: 1, scaleY: 1
        } as TransformComponent);

        commands.addComponent(powerUp, {
          type: "Velocity",
          dx: vx,
          dy: vy
        } as VelocityComponent);

        // Visuals
        commands.addComponent(powerUp, {
          type: "Render",
          shape: "circle",
          size: 10,
          color: this.getColorForType(drop.type),
          zIndex: 10
        } as RenderComponent);

        // Collision
        commands.addComponent(powerUp, {
          type: "Collider2D",
          shape: { type: "circle", radius: 10 },
          offsetX: 0, offsetY: 0,
          layer: layer(6), // PICKUP
          mask: maskOf(layer(1)),  // PLAYER
          isTrigger: true,
          enabled: true
        } as Collider2DComponent);

        // PowerUp logic
        commands.addComponent(powerUp, {
          type: "PowerUp",
          powerUpType: drop.type,
          value: drop.config?.value ?? 1,
          duration: drop.config?.duration ?? 5000
        } as PowerUpComponent);

        // Lifetime
        commands.addComponent(powerUp, {
          type: "TTL",
          remaining: 10000, // 10 seconds to collect
          total: 10000
        } as TTLComponent);

    // Screen wrapping
    commands.addComponent(powerUp, {
        type: "Boundary",
        width: viewport.width,
        height: viewport.height,
        behavior: "wrap"
    } as BoundaryComponent);
  }

  private getColorForType(type: string): string {
    switch (type) {
      case "triple_shot": return "#00FFFF";
      case "shield": return "#FFFF00";
      case "speed": return "#00FF00";
      default: return "#FFFFFF";
    }
  }
}
