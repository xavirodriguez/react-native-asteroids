import type { World } from "./ecs-world"
import { type Entity, GAME_CONFIG } from "../types/GameTypes"

/**
 * Parameters for creating a player ship entity.
 */
export interface CreateShipParams {
  world: World
  x: number
  y: number
}

/**
 * Parameters for creating an asteroid entity.
 */
export interface CreateAsteroidParams {
  world: World
  x: number
  y: number
  size: "large" | "medium" | "small"
}

/**
 * Parameters for creating a bullet entity.
 */
export interface CreateBulletParams {
  world: World
  x: number
  y: number
  angle: number
}

/**
 * Creates a new player ship entity in the world.
 *
 * @param params - The creation parameters.
 * @returns The newly created {@link Entity}.
 */
export function createShip(params: CreateShipParams): Entity {
  const { world, x, y } = params
  const ship = world.createEntity()

  addShipMovementComponents(world, ship, x, y)
  addShipCombatComponents(world, ship)

  return ship
}

function addShipMovementComponents(world: World, ship: Entity, x: number, y: number): void {
  world.addComponent(ship, { type: "Position", x, y })
  world.addComponent(ship, { type: "Velocity", dx: 0, dy: 0 })
  world.addComponent(ship, {
    type: "Render",
    shape: "triangle",
    size: GAME_CONFIG.SHIP_RENDER_SIZE,
    color: "#CCCCCC",
    rotation: 0,
  })
}

function addShipCombatComponents(world: World, ship: Entity): void {
  const initialLives = GAME_CONFIG.SHIP_INITIAL_LIVES
  world.addComponent(ship, { type: "Collider", radius: GAME_CONFIG.SHIP_COLLIDER_RADIUS })
  world.addComponent(ship, {
    type: "Health",
    current: initialLives,
    max: initialLives,
    invulnerableRemaining: 0,
  })
  world.addComponent(ship, {
    type: "Input",
    thrust: false,
    rotateLeft: false,
    rotateRight: false,
    shoot: false,
    shootCooldownRemaining: 0,
  })
}

/**
 * Creates a new asteroid entity in the world.
 *
 * @param params - The creation parameters.
 * @returns The newly created {@link Entity}.
 */
export function createAsteroid(params: CreateAsteroidParams): Entity {
  const { world, x, y, size } = params
  const asteroid = world.createEntity()

  addAsteroidMovementComponents(world, asteroid, x, y)
  addAsteroidTypeComponents(world, asteroid, size)

  return asteroid
}

function addAsteroidMovementComponents(world: World, asteroid: Entity, x: number, y: number): void {
  world.addComponent(asteroid, { type: "Position", x, y })
  world.addComponent(asteroid, {
    type: "Velocity",
    dx: (Math.random() - 0.5) * 100,
    dy: (Math.random() - 0.5) * 100,
  })
}

function addAsteroidTypeComponents(world: World, asteroid: Entity, size: "large" | "medium" | "small"): void {
  const radius = GAME_CONFIG.ASTEROID_RADII[size]
  world.addComponent(asteroid, {
    type: "Render",
    shape: "circle",
    size: radius,
    color: "#888888",
    rotation: 0,
  })
  world.addComponent(asteroid, { type: "Collider", radius })
  world.addComponent(asteroid, { type: "Asteroid", size })
}

/**
 * Creates a new bullet entity in the world.
 *
 * @param params - The creation parameters.
 * @returns The newly created {@link Entity}.
 */
export function createBullet(params: CreateBulletParams): Entity {
  const { world, x, y, angle } = params
  const bullet = world.createEntity()

  addBulletMovementComponents(world, bullet, { x, y, angle })
  addBulletLifeCycleComponents(world, bullet)

  return bullet
}

function addBulletMovementComponents(world: World, bullet: Entity, params: { x: number; y: number; angle: number }): void {
  const { x, y, angle } = params
  const speed = GAME_CONFIG.BULLET_SPEED
  world.addComponent(bullet, { type: "Position", x, y })
  world.addComponent(bullet, {
    type: "Velocity",
    dx: Math.cos(angle) * speed,
    dy: Math.sin(angle) * speed,
  })
}

function addBulletLifeCycleComponents(world: World, bullet: Entity): void {
  const ttl = GAME_CONFIG.BULLET_TTL
  const size = GAME_CONFIG.BULLET_SIZE
  world.addComponent(bullet, { type: "Render", shape: "circle", size, color: "#FFFF00", rotation: 0 })
  world.addComponent(bullet, { type: "Collider", radius: size })
  world.addComponent(bullet, { type: "TTL", remaining: ttl })
  world.addComponent(bullet, { type: "Bullet" })
}
