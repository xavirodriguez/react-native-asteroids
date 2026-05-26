import { World, Entity } from "../engine/core/World";
import { WorldCommandBuffer } from "../engine/core/WorldCommandBuffer";
import { BlueprintRegistry } from "../data/blueprints/BlueprintRegistry";
import { BlueprintOverrides } from "../data/blueprints/types/BlueprintTypes";
import {
  TransformComponent,
  Collider2DComponent,
  HealthComponent,
  BoundaryComponent,
  SpatialNodeComponent,
  TagComponent,
  TTLComponent,
  FrictionComponent
} from "../engine/core/CoreComponents";

/**
 * High-performance assembler for creating entities from blueprints.
 * Strictly zero-allocation in the hot path by recycling component objects.
 */
export class EntityBlueprintAssembler {
  /**
   * Hydrates an entity from a blueprint.
   * Uses pre-compiled copy plans and component recycling.
   */
  public static assemble(
    world: World,
    blueprintId: string,
    x: number,
    y: number,
    overrides?: BlueprintOverrides,
    buffer?: WorldCommandBuffer,
    existingEntityId?: Entity
  ): Entity {
    const blueprint = BlueprintRegistry.get(blueprintId);
    let entityId: Entity;

    if (existingEntityId !== undefined) {
      entityId = existingEntityId;
    } else {
      entityId = buffer ? world.reserveEntityId() : world.createEntity();
    }

    // 1. Tags
    const tags = this.getOrAddMutableComponent<TagComponent>(world, entityId, "Tag", buffer);
    tags.tags = blueprint.tags as string[];

    // 2. Transform
    const transform = this.getOrAddMutableComponent<TransformComponent>(world, entityId, "Transform", buffer);
    transform.x = x;
    transform.y = y;
    transform.rotation = 0;
    transform.scaleX = 1;
    transform.scaleY = 1;
    transform.parentEntity = null;
    transform.dirty = true;

    // 3. Render
    this.hydrateComponent(world, entityId, "Render", blueprintId, "render", blueprint.render, overrides?.render, buffer);

    // 4. Physics / Velocity
    this.hydrateComponent(world, entityId, "Velocity", blueprintId, "physics", blueprint.physics, overrides?.physics, buffer);

    if (blueprint.physics.boundaryBehavior) {
        const gameConfig = world.getResource<Record<string, unknown>>("GameConfig");
        const boundary = this.getOrAddMutableComponent<BoundaryComponent>(world, entityId, "Boundary", buffer);
        boundary.width = (gameConfig?.SCREEN_WIDTH as number) ?? 800;
        boundary.height = (gameConfig?.SCREEN_HEIGHT as number) ?? 600;
        boundary.behavior = blueprint.physics.boundaryBehavior;
    }

    if (blueprint.physics.friction !== undefined) {
        const friction = this.getOrAddMutableComponent<FrictionComponent>(world, entityId, "Friction", buffer);
        friction.value = blueprint.physics.friction;
    }

    if (blueprint.physics.ttl !== undefined) {
        const ttl = this.getOrAddMutableComponent<TTLComponent>(world, entityId, "TTL", buffer);
        ttl.remaining = blueprint.physics.ttl;
        ttl.total = blueprint.physics.ttl;
    }

    // 5. Collision
    const collider = this.getOrAddMutableComponent<Collider2DComponent>(world, entityId, "Collider2D", buffer);
    collider.shape = { type: "circle", radius: blueprint.collision.radius }; // Note: shape is object, but usually blueprints have fixed shapes.
    collider.layer = blueprint.collision.layer;
    collider.mask = blueprint.collision.mask;
    collider.offsetX = 0;
    collider.offsetY = 0;
    collider.isTrigger = blueprint.collision.isTrigger;
    collider.enabled = true;

    if (overrides?.collision) {
        if (overrides.collision.layer !== undefined) collider.layer = overrides.collision.layer;
        if (overrides.collision.mask !== undefined) collider.mask = overrides.collision.mask;
    }

    // 6. Health
    const health = this.getOrAddMutableComponent<HealthComponent>(world, entityId, "Health", buffer);
    health.current = blueprint.stats.health;
    health.max = blueprint.stats.health;
    health.invulnerableRemaining = 0;

    // 7. Metadata (EnemyTag / Behavior markers)
    const enemyTag = this.getOrAddMutableComponent<import("../engine/core/Component").GenericComponent>(world, entityId, "EnemyTag", buffer);
    enemyTag.blueprintId = blueprintId;
    enemyTag.level = 1;
    enemyTag.variant = blueprint.kind === 'invader' ? (blueprint as unknown).invader.archetype : undefined;
    enemyTag.behavior = blueprint.kind === 'ufo' ? (blueprint as unknown).ufo.behavior : undefined;

    // Kind-specific logic
    if (blueprint.kind === 'asteroid') {
        const ast = this.getOrAddMutableComponent<import("../engine/core/Component").GenericComponent>(world, entityId, "Asteroid", buffer);
        const b = blueprint as unknown;
        ast.size = b.asteroid.size;
        ast.splitsInto = b.asteroid.splitsInto;
        ast.splitCount = b.asteroid.splitCount;
    } else if (blueprint.kind === 'projectile') {
        this.getOrAddMutableComponent<import("../engine/core/Component").GenericComponent>(world, entityId, "Bullet", buffer);
    } else if (blueprint.kind === 'invader') {
        const inv = this.getOrAddMutableComponent<import("../engine/core/Component").GenericComponent>(world, entityId, "Invader", buffer);
        inv.archetype = (blueprint as unknown).invader.archetype;
    }

    // 8. Spatial Partitioning
    const spatial = this.getOrAddMutableComponent<SpatialNodeComponent>(world, entityId, "SpatialNode", buffer);
    spatial.lastCellKeys = [];
    spatial.active = true;

    // Final deferred creation registration
    if (buffer && existingEntityId === undefined) {
        buffer.createEntity(entityId);
    }

    return entityId;
  }

  /**
   * Retrieves a component from the world or the recycled pool, adds it to the entity,
   * and returns a mutable reference.
   */
  private static getOrAddMutableComponent<T extends import("../engine/core/Component").Component>(
      world: World,
      entity: Entity,
      type: string,
      buffer?: WorldCommandBuffer
  ): T {
      let comp = world.getMutableComponent(entity, type) as T;
      if (comp) return comp;

      // Try to acquire from pool
      comp = world.acquireComponent<import("../engine/core/Component").Component>(type) as T;
      if (!comp) {
          // Cold path: create new object
          comp = { type } as unknown as T;
      }

      // Add to world/buffer
      if (buffer) {
          buffer.addComponent(entity, comp);
      } else {
          world.addComponent(entity, comp);
      }

      return comp;
  }

  private static hydrateComponent(
    world: World,
    entityId: Entity,
    compType: string,
    blueprintId: string,
    section: string,
    baseData: Record<string, unknown>,
    overrideData: Record<string, unknown> | undefined,
    buffer?: WorldCommandBuffer
  ): void {
    const plan = BlueprintRegistry.getCopyPlan(blueprintId, section);
    if (!plan) return;

    const comp = this.getOrAddMutableComponent<unknown>(world, entityId, compType, buffer);

    // Hot Path Copy Loop (Zero Allocation)
    for (let i = 0; i < plan.length; i++) {
        const key = plan[i];
        comp[key] = baseData[key];
    }

    // Apply Overrides if unknown
    if (overrideData) {
        for (const key in overrideData) {
            comp[key] = overrideData[key];
        }
    }
  }
}
