import { World } from "../../engine/core/World";
import { GAME_CONFIG, INITIAL_GAME_STATE } from "./types/AsteroidTypes";
import {
    TransformComponent,
    VelocityComponent,
    RenderComponent,
    Collider2DComponent,
    TTLComponent,
    FrictionComponent,
    BoundaryComponent,
    HealthComponent,
    ManualMovementComponent,
    TrailComponent,
    SpatialNodeComponent
} from "../../engine/core/CoreComponents";
import { CollisionLayers } from "../../engine/physics/collision/CollisionLayers";
import { createEmitter } from "../../engine/systems/ParticleSystem";
import { generateStarField } from "../../engine/rendering/StarField";
import { RandomService } from "../../engine/utils/RandomService";
import {
    ShipComponent,
    InputComponent,
    BulletComponent,
    AsteroidComponent,
    UfoComponent,
    GameStateComponent
} from "./types/AsteroidTypes";

/**
 * Factoría de entidades para el dominio del juego Asteroids.
 *
 * @responsibility Centralizar la creación de naves, asteroides, UFOs y efectos visuales.
 * @responsibility Garantizar que todas las entidades posean el conjunto mínimo de componentes para su funcionamiento.
 *
 * @remarks
 * La mayoría de las funciones de creación utilizan `RandomService.getInstance("gameplay")` para asegurar
 * que los atributos generados procedimentalmente (ej. formas de asteroides, posiciones de spawn)
 * sean deterministas entre los diferentes clientes de red.
 *
 * @packageDocumentation
 */

/**
 * Crea la entidad de la nave del jugador.
 * @param world - Mundo ECS.
 * @param x - Posición inicial X.
 * @param y - Posición inicial Y.
 * @returns ID de la entidad creada.
 */
export const createShip = ({ world, x, y }: { world: World; x: number; y: number }) => {
  const ship = world.createEntity();
  world.addComponent(ship, { type: "Transform", x, y, rotation: -Math.PI / 2, scaleX: 1, scaleY: 1 } as TransformComponent);
  world.addComponent(ship, { type: "Velocity", dx: 0, dy: 0 } as VelocityComponent);
  world.addComponent(ship, {
    type: "Friction",
    value: GAME_CONFIG.SHIP_FRICTION,
  } as FrictionComponent);
  world.addComponent(ship, {
    type: "Boundary",
    x: 0, y: 0,
    width: GAME_CONFIG.SCREEN_WIDTH,
    height: GAME_CONFIG.SCREEN_HEIGHT,
    behavior: "wrap",
  } as BoundaryComponent);
  world.addComponent(ship, {
    type: "Render",
    shape: "triangle",
    size: GAME_CONFIG.SHIP_RENDER_SIZE,
    color: "white",
    rotation: -Math.PI / 2,
  } as RenderComponent);
  world.addComponent(ship, {
    type: "Collider2D",
    shape: { type: "circle", radius: GAME_CONFIG.SHIP_COLLIDER_RADIUS },
    layer: CollisionLayers.PLAYER,
    mask: CollisionLayers.ENEMY | CollisionLayers.DEBRIS | CollisionLayers.PICKUP, // Asteroids are usually ENEMY or DEBRIS
    offsetX: 0,
    offsetY: 0,
    isTrigger: false,
    enabled: true
  } as Collider2DComponent);
  world.addComponent(ship, { type: "Ship", hyperspaceTimer: 0, hyperspaceCooldownRemaining: 0 } as ShipComponent);
  world.addComponent(ship, {
    type: "Trail",
    points: new Array(GAME_CONFIG.TRAIL_MAX_LENGTH),
    currentIndex: 0,
    count: 0,
    maxLength: GAME_CONFIG.TRAIL_MAX_LENGTH
  } as TrailComponent);
  world.addComponent(ship, { type: "Input", thrust: false, rotateLeft: false, rotateRight: false, shoot: false, hyperspace: false, shootCooldownRemaining: 0 } as InputComponent);
  world.addComponent(ship, { type: "Health", current: 3, max: 3, invulnerableRemaining: GAME_CONFIG.INVULNERABILITY_DURATION } as HealthComponent);
  world.addComponent(ship, { type: "ManualMovement" } as ManualMovementComponent);
  world.addComponent(ship, { type: "SpatialNode", lastCellKeys: [], active: true } as SpatialNodeComponent);

  // Tutorialization particles
  createEmitter(world, {
    position: { x, y },
    rate: 0,
    burst: 5,
    lifetime: { min: 1.5, max: 2.0 },
    speed: { min: 5, max: 15 },
    angle: { min: 0, max: 360 }, // Direction towards center can be complex, using burst spread
    size: { min: 2, max: 4 },
    color: ["#4488FF"],
    loop: false
  });

  return ship;
};

/**
 * Creates a projectile entity.
 * @param world - ECS World.
 * @param x - Spawn X coordinate.
 * @param y - Spawn Y coordinate.
 * @param angle - Movement angle in radians.
 * @param ownerId - Optional sessionId of the player who fired the bullet.
 */
export const createBullet = ({ world, x, y, angle, ownerId }: { world: World; x: number; y: number; angle: number; ownerId?: string }) => {
  const bullet = world.createEntity();
  const dx = Math.cos(angle) * GAME_CONFIG.BULLET_SPEED;
  const dy = Math.sin(angle) * GAME_CONFIG.BULLET_SPEED;

  world.addComponent(bullet, { type: "Transform", x, y, rotation: angle, scaleX: 1, scaleY: 1 } as TransformComponent);
  world.addComponent(bullet, { type: "Velocity", dx, dy } as VelocityComponent);
  world.addComponent(bullet, { type: "Render", shape: "circle", size: GAME_CONFIG.BULLET_SIZE, color: "white", rotation: 0 } as RenderComponent);
  world.addComponent(bullet, {
    type: "Collider2D",
    shape: { type: "circle", radius: GAME_CONFIG.BULLET_SIZE },
    layer: CollisionLayers.PROJECTILE,
    mask: CollisionLayers.ENEMY,
    offsetX: 0,
    offsetY: 0,
    isTrigger: false,
    enabled: true
  } as Collider2DComponent);
  world.addComponent(bullet, { type: "TTL", remaining: GAME_CONFIG.BULLET_TTL, total: GAME_CONFIG.BULLET_TTL } as TTLComponent);
  world.addComponent(bullet, { type: "Bullet", ownerId } as BulletComponent);
  world.addComponent(bullet, { type: "SpatialNode", lastCellKeys: [], active: true } as SpatialNodeComponent);
  return bullet;
};

/**
 * Creates a procedurally generated asteroid.
 *
 * @remarks
 * Asteroid shapes are generated by displacing vertices around a circle.
 * The number of vertices and the displacement amount are determined by the
 * gameplay RNG to ensure cross-client consistency.
 *
 * @param world - ECS World.
 * @param x - Spawn X coordinate.
 * @param y - Spawn Y coordinate.
 * @param size - Enum determining radius and loot probabilities.
 */
export const createAsteroid = ({ world, x, y, size }: { world: World; x: number; y: number; size: "large" | "medium" | "small" }) => {
  const asteroid = world.createEntity();
  const radius = GAME_CONFIG.ASTEROID_RADII[size];
  const gameplayRandom = RandomService.getInstance("gameplay");
  const angle = gameplayRandom.next() * Math.PI * 2;
  const speed = gameplayRandom.nextRange(60, 160) * (size === "large" ? 1 : size === "medium" ? 1.5 : 2);

  const vertices = [];
  const vertexCount = 8 + gameplayRandom.nextInt(0, 5);
  for (let i = 0; i < vertexCount; i++) {
    const a = (i / vertexCount) * Math.PI * 2;
    const r = radius * gameplayRandom.nextRange(0.8, 1.2);
    vertices.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }

  const internalLines = [];
  const crackCount = 2 + gameplayRandom.nextInt(0, 3);
  for (let i = 0; i < crackCount; i++) {
      const v1 = vertices[gameplayRandom.nextInt(0, vertices.length)];
      const v2 = { x: v1.x * 0.3, y: v1.y * 0.3 };
      internalLines.push({ x1: v1.x, y1: v1.y, x2: v2.x, y2: v2.y });
  }

  const colors = { large: "#555555", medium: "#8B4513", small: "#AAAAAA" };

  world.addComponent(asteroid, { type: "Transform", x, y, rotation: gameplayRandom.next() * Math.PI * 2, scaleX: 1, scaleY: 1 } as TransformComponent);
  world.addComponent(asteroid, { type: "Velocity", dx: Math.cos(angle) * speed, dy: Math.sin(angle) * speed } as VelocityComponent);
  world.addComponent(asteroid, {
    type: "Render",
    shape: "polygon",
    size: radius,
    color: colors[size],
    rotation: gameplayRandom.next() * Math.PI * 2,
    angularVelocity: (gameplayRandom.next() - 0.5) * 0.12,
    vertices,
    data: { internalLines }
  } as RenderComponent);
  world.addComponent(asteroid, {
    type: "Collider2D",
    shape: { type: "circle", radius },
    layer: CollisionLayers.ENEMY,
    mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE,
    offsetX: 0,
    offsetY: 0,
    isTrigger: false,
    enabled: true
  } as Collider2DComponent);
  world.addComponent(asteroid, { type: "Asteroid", size } as AsteroidComponent);
  world.addComponent(asteroid, { type: "SpatialNode", lastCellKeys: [], active: true } as SpatialNodeComponent);

  // Add LootTable based on asteroid size
  const lootTable: import("../../engine/core/CoreComponents").LootTableComponent = {
    type: "LootTable",
    drops: [
      { type: "triple_shot", chance: size === "large" ? 0.2 : 0.05, config: { duration: 8000 } },
      { type: "shield", chance: 0.05, config: { duration: 5000 } },
      { type: "speed", chance: 0.05, config: { duration: 6000 } }
    ]
  };
  world.addComponent(asteroid, lootTable);

  world.addComponent(asteroid, {
    type: "Boundary",
    x: 0,
    y: 0,
    width: GAME_CONFIG.SCREEN_WIDTH,
    height: GAME_CONFIG.SCREEN_HEIGHT,
    behavior: "wrap",
  } as BoundaryComponent);
  return asteroid;
};

/**
 * Spawns a new wave of asteroids.
 * Ensures asteroids do not spawn within a safe radius around the screen center
 * to avoid immediate player collisions.
 *
 * @param world - ECS World.
 * @param count - Number of large asteroids to spawn.
 */
export const spawnAsteroidWave = ({ world, count }: { world: World; count: number }) => {
  const gameplayRandom = RandomService.getInstance("gameplay");
  for (let i = 0; i < count; i++) {
    let x, y, dist;
    do {
      x = gameplayRandom.nextRange(0, GAME_CONFIG.SCREEN_WIDTH);
      y = gameplayRandom.nextRange(0, GAME_CONFIG.SCREEN_HEIGHT);
      dist = Math.sqrt(Math.pow(x - GAME_CONFIG.SCREEN_CENTER_X, 2) + Math.pow(y - GAME_CONFIG.SCREEN_CENTER_Y, 2));
    } while (dist < GAME_CONFIG.INITIAL_ASTEROID_SPAWN_RADIUS);

    createAsteroid({ world, x, y, size: "large" });
  }
};

/**
 * Creates a UFO entity that traverses the screen horizontally.
 */
export const createUfo = ({ world }: { world: World }) => {
  const ufo = world.createEntity();
  const gameplayRandom = RandomService.getInstance("gameplay");
  const side = gameplayRandom.next() > 0.5 ? 0 : GAME_CONFIG.SCREEN_WIDTH;
  const y = gameplayRandom.nextRange(0, GAME_CONFIG.SCREEN_HEIGHT);

  world.addComponent(ufo, { type: "Transform", x: side, y, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
  world.addComponent(ufo, { type: "Velocity", dx: side === 0 ? GAME_CONFIG.UFO_SPEED : -GAME_CONFIG.UFO_SPEED, dy: 0 } as VelocityComponent);
  world.addComponent(ufo, { type: "Render", shape: "ufo", size: GAME_CONFIG.UFO_SIZE, color: "#00FF00", rotation: 0 } as RenderComponent);
  world.addComponent(ufo, {
    type: "Collider2D",
    shape: { type: "circle", radius: GAME_CONFIG.UFO_SIZE },
    layer: CollisionLayers.ENEMY,
    mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE,
    offsetX: 0,
    offsetY: 0,
    isTrigger: false,
    enabled: true
  } as Collider2DComponent);
  world.addComponent(ufo, { type: "Ufo", baseY: y, time: 0 } as UfoComponent);
  world.addComponent(ufo, { type: "SpatialNode", lastCellKeys: [], active: true } as SpatialNodeComponent);
  return ufo;
};

export interface CreateParticleParams {
    world: World;
    x: number;
    y: number;
    dx: number;
    dy: number;
    color: string;
    ttl?: number;
    size?: number;
}

/**
 * Creates a temporary visual particle.
 */
export const createParticle = (params: CreateParticleParams) => {
  const { world, x, y, dx, dy, color, ttl = GAME_CONFIG.PARTICLE_TTL_BASE, size = 2 } = params;
  const particle = world.createEntity();

  world.addComponent(particle, { type: "Transform", x, y, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
  world.addComponent(particle, { type: "Velocity", dx, dy } as VelocityComponent);
  world.addComponent(particle, { type: "Render", shape: "particle", size, color, rotation: 0 } as RenderComponent);
  world.addComponent(particle, { type: "TTL", remaining: ttl, total: ttl } as TTLComponent);
  return particle;
};

/**
 * Creates a temporary "hit flash" or explosion spark.
 */
export const createFlash = ({ world, x, y, size }: { world: World; x: number; y: number; size: number }) => {
  const flash = world.createEntity();
  world.addComponent(flash, { type: "Transform", x, y, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
  world.addComponent(flash, { type: "Render", shape: "flash", size, color: "white", rotation: 0 } as RenderComponent);
  world.addComponent(flash, { type: "TTL", remaining: 100, total: 100 } as TTLComponent);
  return flash;
};

/**
 * Initializes the global game state singleton for Asteroids.
 */
export const createGameState = ({ world }: { world: World }) => {
  const gameState = world.createEntity();
  world.addComponent(gameState, {
    ...INITIAL_GAME_STATE,
    lives: GAME_CONFIG.SHIP_INITIAL_LIVES,
    stars: generateStarField(GAME_CONFIG.STAR_COUNT, GAME_CONFIG.SCREEN_WIDTH, GAME_CONFIG.SCREEN_HEIGHT),
    screenShake: null,
    debugCRT: true,
    type: "GameState"
  } as GameStateComponent);
  return gameState;
};
