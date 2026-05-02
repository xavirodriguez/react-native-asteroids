/**
 * Sistema que gestiona el spawn de items (loot) tras la destrucción de entidades.
 *
 * @remarks
 * Desacopla la lógica de destrucción de una entidad de la generación de recompensas.
 * Escucha eventos específicos y utiliza el `LootTableComponent` para determinar
 * qué debe spawnearse.
 *
 * ### Contrato de Eventos:
 * El sistema espera que los eventos porten el ID de la entidad origen y sus coordenadas:
 * - `entity:destroyed`: `{ entity: Entity, type: string }`
 * - `asteroid:destroyed`: `{ entity: Entity, x: number, y: number }`
 *
 * ### Spawning Logic
 * 1. An entity is destroyed.
 * 2. `LootSystem` retrieves its `LootTableComponent`.
 * 3. For each entry in `drops`, it rolls a PRNG check against `drop.chance`.
 * 4. If successful, it creates a new "PowerUp" entity with a `TTLComponent`.
 *
 * @packageDocumentation
 */

import { System } from "../core/System";
import { World } from "../core/World";
import { Entity } from "../core/Entity";
import { EventBus } from "../core/EventBus";
import { LootTableComponent, TransformComponent, VelocityComponent, RenderComponent, Collider2DComponent, TTLComponent, PowerUpComponent, BoundaryComponent } from "../core/CoreComponents";
import { RandomService } from "../utils/RandomService";

/**
 * Coordinates loot generation based on entity destruction events.
 */
export class LootSystem extends System {
  private registeredWorld: World | null = null;

  constructor() {
    super();
  }

  /**
   * Periodically checks if the system needs to register listeners for a new world.
   */
  public update(world: World, _deltaTime: number): void {
    if (this.registeredWorld !== world) {
      this.registerListeners(world);
      this.registeredWorld = world;
    }
  }

  private registerListeners(world: World): void {
    // Ensure we don't have multiple listeners if this system is re-added
    // Although the system instance check in World.addSystem and BaseGame.eventBus.clear()
    // handle most cases, we also check a internal flag.
    if ((this as any)._listenersRegistered) return;

    const eventBus = world.getResource<EventBus>("EventBus");
    if (eventBus) {
      // We listen for a generic destruction event that games should emit
      eventBus.on("entity:destroyed", (payload: { entity: Entity, type: string }) => {
        this.handleEntityDestruction(world, payload.entity);
      });

      // Specific for Asteroids if they don't use the generic one yet
      eventBus.on("asteroid:destroyed", (payload: { entity?: Entity }) => {
        if (payload.entity !== undefined) {
           this.handleEntityDestruction(world, payload.entity);
        }
      });

      (this as any)._listenersRegistered = true;
    }
  }

  private handleEntityDestruction(world: World, entity: Entity): void {
    const loot = world.getComponent<LootTableComponent>(entity, "LootTable");
    const transform = world.getComponent<TransformComponent>(entity, "Transform");

    if (!loot || !transform) return;

    const random = RandomService.getGameplayRandom();

    for (const drop of loot.drops) {
      if (random.chance(drop.chance)) {
        this.spawnPowerUp(world, transform.x, transform.y, drop);
      }
    }
  }

  private spawnPowerUp(world: World, x: number, y: number, drop: any): void {
    const powerUp = world.createEntity();

    // Physical presence
    world.addComponent(powerUp, {
      type: "Transform",
      x, y, rotation: 0, scaleX: 1, scaleY: 1
    } as TransformComponent);

    const random = RandomService.getGameplayRandom();
    world.addComponent(powerUp, {
      type: "Velocity",
      dx: (random.next() - 0.5) * 50,
      dy: (random.next() - 0.5) * 50
    } as VelocityComponent);

    // Visuals
    world.addComponent(powerUp, {
      type: "Render",
      shape: "circle",
      size: 10,
      color: this.getColorForType(drop.type),
      zIndex: 10
    } as RenderComponent);

    // Collision
    world.addComponent(powerUp, {
      type: "Collider2D",
      shape: { type: "circle", radius: 10 },
      offsetX: 0, offsetY: 0,
      layer: 0b01000000, // CollisionLayers.PICKUP
      mask: 0b00000010,  // CollisionLayers.PLAYER
      isTrigger: true,
      enabled: true
    } as Collider2DComponent);

    // PowerUp logic
    world.addComponent(powerUp, {
      type: "PowerUp",
      powerUpType: drop.type,
      value: drop.config?.value ?? 1,
      duration: drop.config?.duration ?? 5000
    } as PowerUpComponent);

    // Lifetime
    world.addComponent(powerUp, {
      type: "TTL",
      remaining: 10000, // 10 seconds to collect
      total: 10000
    } as TTLComponent);

    // Screen wrapping
    world.addComponent(powerUp, {
        type: "Boundary",
        width: 800, // Should be dynamic ideally
        height: 600,
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
