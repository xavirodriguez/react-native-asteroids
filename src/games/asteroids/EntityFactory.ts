import { World } from "../../engine/core/World"
import { type Entity, GAME_CONFIG, type Star } from "../types/GameTypes"

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
 * Parameters for creating a particle entity.
 */
export interface CreateParticleParams {
  world: World
  x: number
  y: number
  dx: number
  dy: number
  color: string
  ttl?: number
  size?: number
}

/**
 * Creates a new player ship entity in the world.
 *
 * @param options - The creation parameters.
 * @returns The newly created {@link Entity}.
 */
export function createShip(options: CreateShipParams): Entity {
  const { world, x, y } = options
  const ship = world.createEntity()

  addShipMovementComponents({ world, ship, x, y })
  addShipCombatComponents({ world, ship })

  return ship
}

function addShipMovementComponents(config: {
  world: World
  ship: Entity
  x: number
  y: number
}): void {
  const { world, ship, x, y } = config
  world.addComponent(ship, { type: "Position", x, y })
  world.addComponent(ship, { type: "Velocity", dx: 0, dy: 0 })
  world.addComponent(ship, {
    type: "Render",
    shape: "triangle",
    size: GAME_CONFIG.SHIP_RENDER_SIZE,
    color: "#CCCCCC",
    rotation: 0,
    trailPositions: [], // Improvement 2: Ship trail positions
  })
}

function addShipCombatComponents(config: { world: World; ship: Entity }): void {
  addShipMetaComponents(config)
  addShipHealthComponent(config)
  addShipInputComponent(config)
}

function addShipMetaComponents(config: { world: World; ship: Entity }): void {
  const { world, ship } = config
  world.addComponent(ship, { type: "Ship" })
  world.addComponent(ship, { type: "Collider", radius: GAME_CONFIG.SHIP_COLLIDER_RADIUS })
}

function addShipHealthComponent(config: { world: World; ship: Entity }): void {
  const { world, ship } = config
  const initialLives = GAME_CONFIG.SHIP_INITIAL_LIVES
  world.addComponent(ship, {
    type: "Health",
    current: initialLives,
    max: initialLives,
    invulnerableRemaining: 0,
  })
}

function addShipInputComponent(config: { world: World; ship: Entity }): void {
  const { world, ship } = config
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
 * @param options - The creation parameters.
 * @returns The newly created {@link Entity}.
 */
export function createAsteroid(options: CreateAsteroidParams): Entity {
  const { world, x, y, size } = options
  const asteroid = world.createEntity()

  addAsteroidMovementComponents({ world, asteroid, x, y })
  addAsteroidTypeComponents({ world, asteroid, size })

  return asteroid
}

function addAsteroidMovementComponents(config: {
  world: World
  asteroid: Entity
  x: number
  y: number
}): void {
  const { world, asteroid, x, y } = config
  world.addComponent(asteroid, { type: "Position", x, y })
  world.addComponent(asteroid, {
    type: "Velocity",
    dx: (Math.random() - 0.5) * 100,
    dy: (Math.random() - 0.5) * 100,
  })
}

function addAsteroidTypeComponents(config: {
  world: World
  asteroid: Entity
  size: "large" | "medium" | "small"
}): void {
  const { world, asteroid, size } = config
  const radius = GAME_CONFIG.ASTEROID_RADII[size]

  // Improvement 5: Polygonal asteroids
  const vertexCount = 10
  const vertices = Array.from({ length: vertexCount }, (_, i) => {
    const angle = (i / vertexCount) * Math.PI * 2
    const r = radius * (0.75 + Math.random() * 0.5)
    return { x: Math.cos(angle) * r, y: Math.sin(angle) * r }
  })

  world.addComponent(asteroid, {
    type: "Render",
    shape: "polygon", // Updated to polygon
    size: radius,
    color: "#888888",
    rotation: 0,
    vertices,
  })
  world.addComponent(asteroid, { type: "Collider", radius })
  world.addComponent(asteroid, { type: "Asteroid", size })
}

/**
 * Creates a new bullet entity in the world.
 *
 * @param options - The creation parameters.
 * @returns The newly created {@link Entity}.
 */
export function createBullet(options: CreateBulletParams): Entity {
  const { world, x, y, angle } = options
  const bullet = world.createEntity()

  addBulletMovementComponents({ world, bullet, x, y, angle })
  addBulletLifeCycleComponents({ world, bullet })

  return bullet
}

function addBulletMovementComponents(config: {
  world: World
  bullet: Entity
  x: number
  y: number
  angle: number
}): void {
  const { world, bullet, x, y, angle } = config
  const speed = GAME_CONFIG.BULLET_SPEED
  world.addComponent(bullet, { type: "Position", x, y })
  world.addComponent(bullet, {
    type: "Velocity",
    dx: Math.cos(angle) * speed,
    dy: Math.sin(angle) * speed,
  })
}

function addBulletLifeCycleComponents(config: { world: World; bullet: Entity }): void {
  const { world, bullet } = config
  const ttl = GAME_CONFIG.BULLET_TTL
  const size = GAME_CONFIG.BULLET_SIZE
  world.addComponent(bullet, { type: "Render", shape: "circle", size, color: "#FFFF00", rotation: 0 })
  world.addComponent(bullet, { type: "Collider", radius: size })
  world.addComponent(bullet, { type: "TTL", remaining: ttl, total: ttl }) // Improvement 1: Total TTL for alpha
  world.addComponent(bullet, { type: "Bullet" })
}

/**
 * Creates a global game state entity.
 *
 * @param config - The world instance.
 * @returns The newly created {@link Entity}.
 */
export function createGameState(config: { world: World }): Entity {
  const { world } = config
  const gameState = world.createEntity()

  // Improvement 3: Star background
  const stars: Star[] = Array.from({ length: GAME_CONFIG.STAR_COUNT }, () => ({
    x: Math.random() * GAME_CONFIG.SCREEN_WIDTH,
    y: Math.random() * GAME_CONFIG.SCREEN_HEIGHT,
    size: Math.random() * 1.5 + 0.5,
    brightness: Math.random() * 0.7 + 0.3,
  }))

  world.addComponent(gameState, {
    type: "GameState",
    lives: GAME_CONFIG.SHIP_INITIAL_LIVES,
    score: 0,
    level: 1,
    asteroidsRemaining: 0,
    isGameOver: false,
    stars,
    screenShake: null, // Improvement 4: Screen shake
  })
  return gameState
}

/**
 * Spawns a wave of asteroids in a circular pattern around the screen center.
 *
 * @param config - The world and the number of asteroids to spawn.
 */
export function spawnAsteroidWave(config: { world: World; count: number }): void {
  const { world, count } = config
  const centerX = GAME_CONFIG.SCREEN_CENTER_X
  const centerY = GAME_CONFIG.SCREEN_CENTER_Y
  const distance = GAME_CONFIG.WAVE_SPAWN_DISTANCE

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count
    const x = centerX + Math.cos(angle) * distance
    const y = centerY + Math.sin(angle) * distance
    createAsteroid({ world, x, y, size: "large" })
  }
}

/**
 * Creates a new particle entity in the world.
 *
 * @param options - The creation parameters.
 * @returns The newly created {@link Entity}.
 */
export function createParticle(options: CreateParticleParams): Entity {
  const { world, x, y, dx, dy, color, ttl = 600, size = 2 } = options
  const particle = world.createEntity()

  world.addComponent(particle, { type: "Position", x, y })
  world.addComponent(particle, { type: "Velocity", dx, dy })
  world.addComponent(particle, {
    type: "Render",
    shape: "particle",
    size,
    color,
    rotation: 0,
  })
  world.addComponent(particle, { type: "TTL", remaining: ttl, total: ttl })

  return particle
}
