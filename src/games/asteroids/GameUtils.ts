import { World } from "../../engine/core/World";
import { type GameStateComponent, INITIAL_GAME_STATE, GAME_CONFIG } from "../../types/GameTypes";
import { ParticlePool } from "./EntityPool";
import { createParticle } from "./EntityFactory";

/**
 * Utility functions for the Asteroids game.
 */

/**
 * Retrieves the global game state from the ECS world.
 *
 * @param world - The ECS world instance.
 * @returns The current {@link GameStateComponent} or {@link INITIAL_GAME_STATE} if not found.
 */
export function getGameState(world: World): GameStateComponent {
  const [gameStateEntity] = world.query("GameState");
  if (gameStateEntity === undefined) {
    return INITIAL_GAME_STATE;
  }
  return world.getComponent<GameStateComponent>(gameStateEntity, "GameState") ?? INITIAL_GAME_STATE;
}

/**
 * Improvement 12: Elaborate explosion with flash and two particle waves.
 */
export function createExplosion(
  world: World,
  x: number,
  y: number,
  radius: number,
  particlePool: ParticlePool
): void {
  // 1. Radial flash entity
  const flash = world.createEntity();
  world.addComponent(flash, { type: "Position", x, y });
  world.addComponent(flash, {
    type: "Render",
    shape: "flash",
    size: radius * 1.5,
    color: "white",
    rotation: 0,
  });
  world.addComponent(flash, { type: "TTL", remaining: 200, total: 200 });

  // 2. Large, slow particles (1st wave)
  const largeCount = 8;
  for (let i = 0; i < largeCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 20;
    createParticle({
      world,
      x,
      y,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      color: "#FF8800",
      size: 4 + Math.random() * 2,
      ttl: 800,
      pool: particlePool,
    });
  }

  // 3. Small, fast particles (2nd wave)
  const smallCount = 15;
  for (let i = 0; i < smallCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 40;
    createParticle({
      world,
      x,
      y,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      color: "#FFFF00",
      size: 1 + Math.random() * 1.5,
      ttl: 400,
      pool: particlePool,
    });
  }
}
