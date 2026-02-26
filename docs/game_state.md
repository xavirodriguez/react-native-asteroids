# Game State System - Technical Documentation

## Overview

The `GameStateSystem` (`src/game/systems/GameStateSystem.ts`) is responsible for managing global game progress, wave spawning, and game-over conditions.

## Global Game State Management

The game state is stored in a single `GameStateComponent` instance in the ECS world. This component tracks:
- `lives`: Synchronized with the player's health.
- `score`: Total points accumulated.
- `level`: Current level (determines asteroid count in a wave).
- `asteroidsRemaining`: Count of active asteroids in the world.
- `isGameOver`: Boolean flag indicating if the game has ended.

## System Workflow

The system updates several sub-tasks sequentially on every frame:

### 1. Update Asteroids Count

```typescript
private updateAsteroidsCount(world: World, gameState: GameStateComponent): void {
  const asteroids = world.query("Asteroid");
  gameState.asteroidsRemaining = asteroids.length;
}
```

This count is used as the primary condition for level progression.

### 2. Wave Spawning Logic

If `asteroidsRemaining` reaches 0, the system triggers the spawning of a new wave:

```typescript
private spawnWaveIfCleared(world: World, gameState: GameStateComponent): void {
  if (gameState.asteroidsRemaining === 0) {
    this.spawnAsteroidWave(world, gameState.level);
    gameState.level++;
  }
}
```

The wave size increases linearly with the level: `Math.min(initialCount + level, maxCount)`.

### 3. Player Status Synchronization

The system keeps the global `lives` count in sync with the actual health of the player ship entity:

```typescript
private updatePlayerStatus(world: World, gameState: GameStateComponent, deltaTime: number): void {
  const ships = world.query("Health", "Input");
  if (ships.length > 0) {
    const health = world.getComponent<HealthComponent>(ships[0], "Health")!;
    gameState.lives = health.current;

    // Also updates invulnerability timer
    if (health.invulnerableRemaining > 0) {
      health.invulnerableRemaining -= deltaTime;
    }
  }
}
```

### 4. Game Over Conditions

The system checks if the player's health has reached 0. If it has, the system:
1. Sets `isGameOver` to true in the game state.
2. Logs the final score.
3. Pauses the game loop via the `IAsteroidsGame` instance.

## Performance and Design Decisions

- **Single Instance**: The system assumes there is only one `GameStateComponent` in the world.
- **Reference Passing**: The `GameStateSystem` receives a reference to the `IAsteroidsGame` instance in its constructor. This allows it to pause or resume the game loop directly without going through an event bus.
- **Query Efficiency**: Counting asteroids uses the optimized world query system (O(M) where M is the number of asteroids).

## Security and Edge Cases

- **No Ship in World**: If the ship entity is removed, the system will not update the player status or check for game over based on health until a new ship is created.
- **Invulnerability**: The `invulnerableRemaining` timer is managed within this system to ensure it's updated consistently with the game clock (`deltaTime`).
- **Level Scaling**: The level scaling is capped at `GAME_CONFIG.MAX_WAVE_ASTEROIDS` to maintain performance and gameplay balance.
