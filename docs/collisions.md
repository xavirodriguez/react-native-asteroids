# Collision System - Technical Documentation

## Overview

The `CollisionSystem` (`src/game/systems/CollisionSystem.ts`) is responsible for detecting and resolving physical interactions between entities in the game world.

## Architecture

The system uses a brute-force approach (O(n²) complexity) to check all pairs of entities possessing both a `PositionComponent` and a `ColliderComponent`.

## Detection Algorithm

### Entity Query

```typescript
const colliders = world.query("Position", "Collider");
```

Only entities with these two components are considered for collision detection.

### Squared Distance Optimization

To optimize the hot path, the system uses squared distance calculations to avoid expensive `Math.sqrt()` operations.

```typescript
// isColliding logic
const dx = x1 - x2;
const dy = y1 - y2;
const radiusSum = colA.radius + colB.radius;

return dx * dx + dy * dy < radiusSum * radiusSum;
```

**Formula**: `(x₁ - x₂)² + (y₁ - y₂)² < (r₁ + r₂)²`

## Resolution Strategies

Collisions are resolved by type, following a specific hierarchy:
1. **Bullet hits Asteroid**:
   - The asteroid splits (if large or medium) or is removed.
   - The bullet is removed.
   - The score is updated by `GAME_CONFIG.ASTEROID_SCORE`.
2. **Ship hits Asteroid**:
   - The ship takes damage (health reduces by 1).
   - The ship enters a temporary invulnerability period (grace period).
   - The asteroid remains in the world.

### Invulnerability Handling

The `HealthComponent` tracks a `invulnerableRemaining` timer. Damage is only applied if this timer is less than or equal to 0.

```typescript
if (health.invulnerableRemaining <= 0) {
  health.current--;
  health.invulnerableRemaining = GAME_CONFIG.INVULNERABILITY_DURATION;
}
```

This prevents the player from losing multiple lives in a single frame when overlapping with an asteroid.

### Asteroid Splitting Hierarchy

The splitting logic follows a pre-defined strategy to avoid complex conditional branches:
- **Large**: Spawns 2 medium asteroids with a large offset.
- **Medium**: Spawns 2 small asteroids with a medium offset.
- **Small**: The asteroid simply disappears.

## Performance and Scalability

- **Complexity**: O(n²) where n is the number of collidables.
- **Suitability**: For a game like Asteroids with a limited number of active entities (bullets and asteroids), this approach is highly efficient and straightforward.
- **Memory**: The system operates on the world state in-place and doesn't allocate temporary arrays except for the initial query results.

## Security and Edge Cases

- **Double Collisions**: The system checks all pairs and uses early returns in `resolveCollision` to prevent multiple resolutions for the same event in a single frame.
- **Component Existence**: The system uses guard clauses to ensure all required components still exist before processing a collision (e.g., if an entity was already removed by a previous collision in the same frame).
- **Invariants**: Collision resolution maintains the global score and the health invariants of the player ship.
