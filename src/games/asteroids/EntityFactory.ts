import { World } from "../../engine/core/World"
import { type Entity, GAME_CONFIG, type Star } from "../../types/GameTypes"

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
    hyperspace: false,
    shootCooldownRemaining: 0,
  })
}

function addShipMetaComponents(config: { world: World; ship: Entity }): void {
  const { world, ship } = config
  world.addComponent(ship, {
    type: "Ship",
    hyperspaceTimer: 0,
    hyperspaceCooldownRemaining: 0,
  })
  world.addComponent(ship, { type: "Collider", radius: GAME_CONFIG.SHIP_COLLIDER_RADIUS })

  // Add pulsing animation for the core
  world.addComponent(ship, {
    type: "Animation",
    property: "pulse",
    waveType: "sine",
    frequency: 0.8, // 0.8 Hz roughly matches original pulse speed
    amplitude: 0.1,
    currentValue: 1.0,
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

  // Improvement 1 & 9: Varied colors/vertices and cracks
  const configMap = {
    large: { color: "#666666", minV: 10, maxV: 14, roughness: 0.4 },
    medium: { color: "#887766", minV: 8, maxV: 12, roughness: 0.3 },
    small: { color: "#AAAAAA", minV: 6, maxV: 10, roughness: 0.2 },
  }
  const { color, minV, maxV, roughness } = configMap[size]

  const vertexCount = minV + Math.floor(Math.random() * (maxV - minV + 1))
  const vertices = Array.from({ length: vertexCount }, (_, i) => {
    const angle = (i / vertexCount) * Math.PI * 2
    const r = radius * (1 - roughness + Math.random() * roughness * 2)
    return { x: Math.cos(angle) * r, y: Math.sin(angle) * r }
  })

  const internalLines = Array.from({ length: size === "large" ? 3 : size === "medium" ? 2 : 0 }, () => {
    const v1 = vertices[Math.floor(Math.random() * vertices.length)]
    const v2 = vertices[Math.floor(Math.random() * vertices.length)]
    return { x1: v1.x * 0.5, y1: v1.y * 0.5, x2: v2.x * 0.8, y2: v2.y * 0.8 }
  })

  world.addComponent(asteroid, {
    type: "Render",
    shape: "polygon",
    size: radius,
    color,
    rotation: Math.random() * Math.PI * 2,
    vertices,
    internalLines,
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
  world.addComponent(bullet, {
    type: "Render",
    shape: "circle",
    size,
    color: "#FFFF00",
    rotation: 0,
    trailPositions: [],
  })
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

  // Improvement 3, 5 & 8: Enhanced starfield with parallax and twinkling
  const stars: Star[] = Array.from({ length: GAME_CONFIG.STAR_COUNT }, () => ({
    x: Math.random() * GAME_CONFIG.SCREEN_WIDTH,
    y: Math.random() * GAME_CONFIG.SCREEN_HEIGHT,
    size: Math.random() * 1.5 + 0.5,
    brightness: Math.random() * 0.7 + 0.3,
    twinklePhase: Math.random() * Math.PI * 2,
    twinkleSpeed: 0.5 + Math.random() * 2.5,
    layer: Math.floor(Math.random() * 3), // 0, 1, 2
  }))

  world.addComponent(gameState, {
    type: "GameState",
    lives: GAME_CONFIG.SHIP_INITIAL_LIVES,
    score: 0,
    level: 1,
    asteroidsRemaining: 0,
    isGameOver: false,
    stars,
    screenShake: null,
  })
  return gameState
}

/**
 * Creates a new UFO entity.
 */
export function createUfo(world: World, x: number, y: number): Entity {
  const ufo = world.createEntity()
  const dx = (x === 0 ? 1 : -1) * GAME_CONFIG.UFO_SPEED

  world.addComponent(ufo, { type: "Position", x, y })
  world.addComponent(ufo, { type: "Velocity", dx, dy: 0 })
  world.addComponent(ufo, {
    type: "Render",
    shape: "ufo",
    size: GAME_CONFIG.UFO_SIZE,
    color: "#FF0000",
    rotation: 0,
  })
  world.addComponent(ufo, { type: "Collider", radius: GAME_CONFIG.UFO_SIZE * 0.8 })
  world.addComponent(ufo, { type: "Ufo", baseY: y, time: 0 })

  return ufo
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

/**
 * Creates a elaborate explosion with multiple particle waves and a flash.
 */
export function createExplosion(world: World, x: number, y: number, radius: number): void {
  // 1. Flash entity
  const flash = world.createEntity()
  world.addComponent(flash, { type: "Position", x, y })
  world.addComponent(flash, {
    type: "Render",
    shape: "flash",
    size: radius * 2,
    color: "#FFFFFF",
    rotation: 0,
  })
  world.addComponent(flash, { type: "TTL", remaining: 200, total: 200 })

  // 2. Wave 1: Fast, small particles
  for (let i = 0; i < 15; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 100 + Math.random() * 100
    createParticle({
      world,
      x,
      y,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      color: "#FFCC00",
      ttl: 300 + Math.random() * 300,
      size: 1 + Math.random() * 2,
    })
  }

  // 3. Wave 2: Slower, larger particles
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 40 + Math.random() * 60
    createParticle({
      world,
      x,
      y,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      color: "#FF4400",
      ttl: 600 + Math.random() * 400,
      size: 3 + Math.random() * 3,
    })
  }
}
