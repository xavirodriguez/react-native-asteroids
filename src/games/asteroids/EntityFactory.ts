import { World } from "../../engine/core/World"
import { type Entity, GAME_CONFIG } from "../../types/GameTypes"
import { BulletPool, ParticlePool } from "./EntityPool"
import { generateStarField } from "../../game/StarField"
import { RandomService } from "../../engine/utils/RandomService"

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
  pool: BulletPool
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
  pool: ParticlePool
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
  })
}

function addShipCombatComponents(config: { world: World; ship: Entity }): void {
  addShipMetaComponents(config)
  addShipHealthComponent(config)
  addShipInputComponent(config)
}

function addShipMetaComponents(config: { world: World; ship: Entity }): void {
  const { world, ship } = config
  world.addComponent(ship, {
    type: "Ship",
    hyperspaceTimer: 0,
    hyperspaceCooldownRemaining: 0,
    trailPositions: [], // Improvement 2: Ship trail positions
  })
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
    dx: (RandomService.next() - 0.5) * 100,
    dy: (RandomService.next() - 0.5) * 100,
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
  const vertexCount = RandomService.nextInt(8, 13); // 8 to 12 vertices
  const vertices = Array.from({ length: vertexCount }, (_, i) => {
    const angle = (i / vertexCount) * Math.PI * 2;
    // Each vertex has an irregular radius: radius * (0.75 + random*0.5)
    const r = radius * (0.75 + RandomService.next() * 0.5);
    return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
  });

  world.addComponent(asteroid, {
    type: "Render",
    shape: "polygon",
    size: radius,
    color: "#AAAAAA",
    rotation: RandomService.nextRange(0, Math.PI * 2), // Improvement 5: Randomized initial rotation
    angularVelocity: (RandomService.next() - 0.5) * 0.04, // Improvement 7: Random slow rotation
    vertices,
    hitFlashFrames: 0, // Improvement 9: Hit flash tracker
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
  const { world, x, y, angle, pool } = options
  const speed = GAME_CONFIG.BULLET_SPEED
  const ttl = GAME_CONFIG.BULLET_TTL
  const size = GAME_CONFIG.BULLET_SIZE

  return pool.acquire(
    world,
    x,
    y,
    Math.cos(angle) * speed,
    Math.sin(angle) * speed,
    size,
    "#FFFF00",
    ttl
  )
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
  const stars = generateStarField(
    GAME_CONFIG.STAR_COUNT,
    GAME_CONFIG.SCREEN_WIDTH,
    GAME_CONFIG.SCREEN_HEIGHT
  )

  world.addComponent(gameState, {
    type: "GameState",
    lives: GAME_CONFIG.SHIP_INITIAL_LIVES,
    score: 0,
    level: 1,
    asteroidsRemaining: 0,
    isGameOver: false,
    stars,
    screenShake: null, // Improvement 4: Screen shake
    debugCRT: true, // Improvement 10: Enable CRT effects by default
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
  const { world, x, y, dx, dy, color, ttl = 600, size = 2, pool } = options
  return pool.acquire(world, x, y, dx, dy, size, color, ttl)
}

/**
 * Creates a new UFO entity.
 */
export function createUfo(world: World, x: number, y: number): Entity {
  const ufo = world.createEntity();
  world.addComponent(ufo, { type: "Position", x, y });
  world.addComponent(ufo, { type: "Velocity", dx: 80, dy: 0 });
  world.addComponent(ufo, {
    type: "Render",
    shape: "ufo",
    size: 15,
    color: "#FF0000",
    rotation: 0,
  });
  world.addComponent(ufo, { type: "Collider", radius: 15 });
  world.addComponent(ufo, { type: "Ufo", baseY: y, time: 0 });
  return ufo;
}
