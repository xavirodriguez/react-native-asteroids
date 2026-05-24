import { World } from "../engine/core/World";
import { Entity, Component } from "../engine/types/EngineTypes";
import { EnemyBlueprints } from "../data/blueprints/EnemyBlueprints";
import { EnemyTagComponent } from "../components/enemy/EnemyTagComponent";
import {
    TransformComponent,
    VelocityComponent,
    RenderComponent,
    Collider2DComponent,
    HealthComponent,
    BoundaryComponent,
    SpatialNodeComponent,
    TagComponent,
    TTLComponent,
    FrictionComponent
} from "../engine/core/CoreComponents";

/**
 * Interface for runtime overrides when creating an enemy.
 */
export interface EnemyOverrides {
  health?: number;
  speed?: number;
  velocity?: { dx: number; dy: number };
  rotation?: number;
  color?: string;
  variant?: string;
  behavior?: string;
  renderData?: Record<string, unknown>;
  vertices?: { x: number; y: number }[];
  data?: Record<string, unknown>;
}

/**
 * Data-Driven factory for creating enemy entities based on blueprints.
 */
export class EnemyFactory {
  /**
   * Creates an enemy entity from a blueprint with optional runtime overrides.
   *
   * @param world - The ECS World.
   * @param blueprintId - Identifier of the blueprint to use.
   * @param x - Initial X position.
   * @param y - Initial Y position.
   * @param overrides - Optional property overrides.
   * @param deferred - If true, entity creation is queued via CommandBuffer.
   */
  public static createEnemy(
    world: World,
    blueprintId: string,
    x: number,
    y: number,
    overrides: EnemyOverrides = {},
    deferred?: boolean
  ): Entity {
    const blueprint = EnemyBlueprints[blueprintId];
    if (!blueprint) {
      throw new Error(`EnemyFactory: Blueprint "${blueprintId}" not found.`);
    }

    const { entity, add } = this.createBaseEntity(world, deferred);

    // 1. Transform
    add({
      type: "Transform",
      x,
      y,
      rotation: overrides.rotation ?? 0,
      scaleX: 1,
      scaleY: 1
    } as TransformComponent);

    // 2. Velocity & Physics
    if (blueprint.physics) {
      const dx = overrides.velocity?.dx ?? 0;
      const dy = overrides.velocity?.dy ?? 0;

      add({
        type: "Velocity",
        dx,
        dy,
        vAngle: 0
      } as VelocityComponent);

      if (blueprint.physics.boundaryBehavior) {
          const gameConfig = world.getResource<Record<string, unknown>>("GameConfig");
          add({
            type: "Boundary",
            width: (gameConfig?.SCREEN_WIDTH as number) ?? 800,
            height: (gameConfig?.SCREEN_HEIGHT as number) ?? 600,
            behavior: blueprint.physics.boundaryBehavior
          } as BoundaryComponent);
      }

      if (blueprint.physics.friction !== undefined) {
          add({
              type: "Friction",
              value: blueprint.physics.friction
          } as FrictionComponent);
      }

      if (blueprint.physics.ttl !== undefined) {
          add({
              type: "TTL",
              remaining: blueprint.physics.ttl,
              total: blueprint.physics.ttl
          } as TTLComponent);
      }
    }

    // 3. Rendering
    add({
      type: "Render",
      shape: blueprint.render.shape,
      size: blueprint.render.size,
      color: overrides.color ?? blueprint.render.color,
      rotation: overrides.rotation ?? 0,
      zIndex: blueprint.render.zIndex ?? 0,
      vertices: overrides.vertices,
      data: overrides.renderData ?? {}
    } as RenderComponent);

    // 4. Collision
    add({
      type: "Collider2D",
      shape: blueprint.collision.radius
        ? { type: "circle", radius: blueprint.collision.radius }
        : { type: "aabb", halfWidth: blueprint.collision.halfWidth ?? 10, halfHeight: blueprint.collision.halfHeight ?? 10 },
      layer: blueprint.collision.layer,
      mask: blueprint.collision.mask,
      offsetX: 0,
      offsetY: 0,
      isTrigger: blueprint.collision.isTrigger,
      enabled: true
    } as Collider2DComponent);

    // 5. Health
    const maxHealth = overrides.health ?? blueprint.stats.health;
    add({
      type: "Health",
      current: maxHealth,
      max: maxHealth,
      invulnerableRemaining: 0
    } as HealthComponent);

    // 6. Enemy Metadata & Tags
    add({
      type: "EnemyTag",
      blueprintId,
      variant: overrides.variant ?? (blueprint.kind === 'invader' ? blueprint.invader.archetype : undefined),
      level: 1,
      behavior: overrides.behavior ?? (blueprint.kind === 'ufo' ? blueprint.ufo.behavior : undefined)
    } as EnemyTagComponent);

    if (blueprint.tags.length > 0) {
        add({
            type: "Tag",
            tags: [...blueprint.tags]
        } as TagComponent);
    }

    // 7. Spatial Partitioning
    add({
      type: "SpatialNode",
      lastCellKeys: [],
      active: true
    } as SpatialNodeComponent);

    return entity;
  }

  /**
   * Internal helper for entity creation logic.
   */
  private static createBaseEntity(world: World, deferred?: boolean): { entity: Entity, add: (comp: Component) => void } {
    const isDeferred = !!(deferred || world.isUpdating);
    const commands = world.getCommandBuffer();

    if (isDeferred) {
      const entity = world.reserveEntityId();
      commands.createEntity(entity);
      return {
        entity,
        add: (comp: Component) => commands.addComponent(entity, comp)
      };
    }

    const entity = world.createEntity();
    return {
      entity,
      add: (comp: Component) => world.addComponent(entity, comp)
    };
  }
}
