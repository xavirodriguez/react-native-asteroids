import type { World } from "./ecs-world"
import { type Entity, GAME_CONFIG } from "../types/GameTypes"

/**
 * Creates a new player ship entity in the world.
 *
 * @param world - The ECS world.
 * @param x - Initial X position.
 * @param y - Initial Y position.
 * @returns The newly created {@link Entity}.
 *
 * @remarks
 * The ship entity is created with Position, Velocity, Render, Collider, Health, and Input components.
 *
 * @example
 * ```typescript
 * const player = createShip(world, 400, 300);
 * ```
 */
export function createShip(world: World, x: number, y: number): Entity {
  const ship = world.createEntity()

  world.addComponent(ship, { type: "Position", x, y })
  world.addComponent(ship, { type: "Velocity", dx: 0, dy: 0 })
  world.addComponent(ship, {
    type: "Render",
    shape: "triangle",
    size: 10,
    color: "#CCCCCC",
    rotation: 0,
  })
  world.addComponent(ship, { type: "Collider", radius: 8 })
  world.addComponent(ship, {
    type: "Health",
    current: 3,
    max: 3,
    invulnerableRemaining: 0,
  })
  world.addComponent(ship, {
    type: "Input",
    thrust: false,
    rotateLeft: false,
    rotateRight: false,
    shoot: false,
  })

  return ship
}

/**
 * Creates a new asteroid entity in the world.
 *
 * @param world - The ECS world.
 * @param x - Initial X position.
 * @param y - Initial Y position.
 * @param size - The size category of the asteroid ("large", "medium", or "small").
 * @returns The newly created {@link Entity}.
 *
 * @remarks
 * Asteroids are created with Position, Velocity, Render, Collider, and Asteroid components.
 * Their velocity is randomized.
 *
 * @example
 * ```typescript
 * const asteroid = createAsteroid(world, 100, 100, "large");
 * ```
 */
export function createAsteroid(world: World, x: number, y: number, size: "large" | "medium" | "small"): Entity {
  const asteroid = world.createEntity()
  const sizeMap = { large: 30, medium: 20, small: 10 }

  world.addComponent(asteroid, { type: "Position", x, y })
  world.addComponent(asteroid, {
    type: "Velocity",
    dx: (Math.random() - 0.5) * 100,
    dy: (Math.random() - 0.5) * 100,
  })
  world.addComponent(asteroid, {
    type: "Render",
    shape: "circle",
    size: sizeMap[size],
    color: "#888888",
    rotation: 0,
  })
  world.addComponent(asteroid, { type: "Collider", radius: sizeMap[size] })
  world.addComponent(asteroid, { type: "Asteroid", size })

  return asteroid
}

/**
 * Creates a new bullet entity in the world.
 *
 * @param world - The ECS world.
 * @param x - Initial X position.
 * @param y - Initial Y position.
 * @param angle - The angle in radians at which the bullet is fired.
 * @returns The newly created {@link Entity}.
 *
 * @remarks
 * Bullets are created with Position, Velocity, Render, Collider, and TTL (Time-To-Live) components.
 * Their velocity is determined by the `angle` and `GAME_CONFIG.BULLET_SPEED`.
 *
 * @example
 * ```typescript
 * createBullet(world, playerPos.x, playerPos.y, playerRotation);
 * ```
 */
export function createBullet(world: World, x: number, y: number, angle: number): Entity {
  const bullet = world.createEntity()

  world.addComponent(bullet, { type: "Position", x, y })
  world.addComponent(bullet, {
    type: "Velocity",
    dx: Math.cos(angle) * GAME_CONFIG.BULLET_SPEED,
    dy: Math.sin(angle) * GAME_CONFIG.BULLET_SPEED,
  })
  world.addComponent(bullet, {
    type: "Render",
    shape: "circle",
    size: 2,
    color: "#FFFF00",
    rotation: 0,
  })
  world.addComponent(bullet, { type: "Collider", radius: 2 })
  world.addComponent(bullet, { type: "TTL", remaining: GAME_CONFIG.BULLET_TTL })

  return bullet
}
