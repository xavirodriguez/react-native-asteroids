# TTL System - Technical Documentation

## Overview

The `TTLSystem` (`src/game/systems/TTLSystem.ts`) implements a time-to-live management system for temporary entities, such as bullets and other projectiles.

## Component Contract

The system operates on entities possessing the `TTLComponent` as defined in `src/types/GameTypes.ts`:

```typescript
export interface TTLComponent extends Component {
  type: "TTL";
  remaining: number; // Remaining time in milliseconds
}
```

## System Update Cycle

The system update method (`update`) follows a two-phase algorithm:

### Phase 1: Update and Filter

```typescript
const ttlEntities = world.query("TTL");
const entitiesToRemove: number[] = [];

ttlEntities.forEach((entity) => {
  const ttl = world.getComponent<TTLComponent>(entity, "TTL")!;
  ttl.remaining -= deltaTime;

  if (ttl.remaining <= 0) {
    entitiesToRemove.push(entity);
  }
});
```

**Temporal Decrement**: The system uses `remaining -= deltaTime` where `deltaTime` is in milliseconds. This ensures the system is frame-rate independent.

### Phase 2: Deferred Removal

```typescript
entitiesToRemove.forEach((entity) => {
  world.removeEntity(entity);
});
```

**Pattern**: This deferred removal prevents modification of the entity list during iteration, which can lead to unpredictable behavior in the ECS world.

## Primary Use Case: Projectiles

The primary use of the TTL system is to manage the lifespan of bullets. Bullets are created with a fixed TTL:

```typescript
// From EntityFactory.createBullet
world.addComponent(bullet, { type: "TTL", remaining: GAME_CONFIG.BULLET_TTL });
```

With `BULLET_SPEED: 300` pixels/sec and `BULLET_TTL: 2000` ms, a bullet can travel exactly 600 pixels before it is automatically removed by the TTL system.

## Performance and Scalability

- **Complexity**: O(T) where T is the number of entities with a `TTLComponent`.
- **Memory**: The system minimizes object allocations by using a temporary array of IDs (`entitiesToRemove`) for the deferred removal phase.

## Security and Edge Cases

- **Game Pause**: The `TTLSystem.update()` is only called when the game is not paused. Therefore, the lifespan of entities is correctly "paused" when the player pauses the game.
- **Immediate Expiration**: If an entity is created with a non-positive `remaining` value, it will be removed in the very next frame.
- **Multiple Components**: The system only interacts with the `TTLComponent`. It is safe to use on any entity regardless of its other components (e.g., renderable or non-renderable).

## Interaction with Other Systems

- **InputSystem**: Creates bullets with the `TTLComponent`.
- **CollisionSystem**: Can remove entities (bullets) prematurely if they collide with an asteroid, regardless of their remaining TTL.
- **World.version**: Each removal by the `TTLSystem` increments the `world.version`, notifying observers of the change.
