# Entity Factory - Technical Documentation

## Overview

The module `src/game/EntityFactory.ts` provides a set of factory functions to create pre-configured entities in the Asteroids game world. This ensures consistency and centralization of entity initialization.

## Entity Creation Patterns

### createShip(world: World, x: number, y: number): Entity

Creates a new player ship entity with the necessary components for physics, input, health, and rendering.

- **Purpose**: Initializes the main player object.
- **Contract**:
  - `world`: The ECS world instance.
  - `x`, `y`: Initial screen coordinates in pixels.
- **Invariants**:
  - Starts with 0 initial velocity.
  - Initialized with `GAME_CONFIG.SHIP_INITIAL_LIVES` for both current and max health.
  - `invulnerableRemaining` is set to 0 initially.
- **Components Attached**:
  - `Position`: (x, y)
  - `Velocity`: (0, 0)
  - `Render`: Shape `triangle`, size 10, color `#CCCCCC`.
  - `Collider`: Radius 8.
  - `Health`: Current/Max health and invulnerability timer.
  - `Input`: All flags (thrust, rotate, shoot) set to false.

### createAsteroid(world: World, x: number, y: number, size: "large" | "medium" | "small"): Entity

Creates a new asteroid entity with random velocity and size-specific rendering.

- **Purpose**: Spawns obstacles and targets for the player.
- **Contract**:
  - `world`: The ECS world instance.
  - `x`, `y`: Initial screen coordinates.
  - `size`: Affects the collider radius and rendering size.
- **Invariants**:
  - Receives a random velocity vector scaled by ±50 units.
- **Components Attached**:
  - `Position`: (x, y)
  - `Velocity`: Random (dx, dy)
  - `Render`: Shape `circle`, size from `asteroidRadiusMap`.
  - `Collider`: Radius matches render size.
  - `Asteroid`: Size category marker.

### createBullet(world: World, x: number, y: number, angle: number): Entity

Creates a new projectile entity with a fixed speed and limited lifespan.

- **Purpose**: Represents bullets fired by the player.
- **Contract**:
  - `world`: The ECS world instance.
  - `x`, `y`: Starting coordinates.
  - `angle`: Launch angle in radians.
- **Invariants**:
  - Speed is fixed at `GAME_CONFIG.BULLET_SPEED`.
  - Time-to-live is set to `GAME_CONFIG.BULLET_TTL`.
- **Components Attached**:
  - `Position`: (x, y)
  - `Velocity`: Calculated from angle and speed.
  - `Render`: Shape `circle`, size 2, color `#FFFF00`.
  - `Collider`: Radius 2.
  - `TTL`: Lifespan timer in milliseconds.
  - `Bullet`: Marker component for collision detection.

## Performance Considerations

- **Initialization Efficiency**: Factories use direct `addComponent` calls on the `World` instance.
- **Config-Driven**: Many initial values (speed, radius, TTL) are read from `GAME_CONFIG` to allow for easy global tuning.

## Security and Edge Cases

- **Screen Boundaries**: While the factory creates entities at specific coordinates, the `MovementSystem` is responsible for enforcing screen wrapping and boundary logic.
- **Invalid Parameters**: If an invalid `size` is passed to `createAsteroid`, it will use values from the `asteroidRadiusMap`.
- **World State**: Creating entities via the factory automatically increments the `world.version`, notifying any observers (like the `GameRenderer`) of the structural change.
