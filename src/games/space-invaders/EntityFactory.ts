import { World } from "../../engine/core/World";
import { Entity } from "../../engine/types/EngineTypes";
import { GAME_CONFIG } from "./types/SpaceInvadersTypes";
import { PlayerBulletPool, EnemyBulletPool, ParticlePool } from "./EntityPool";
import { createEmitter } from "../../engine/systems/ParticleSystem";
import { CollisionLayers } from "../../engine/physics/collision/CollisionLayers";
import { Collider2DComponent, BoundaryComponent } from "../../engine/core/CoreComponents";

/**
 * Entity factory for the Space Invaders game domain.
 *
 * Coordinates the creation of players, invaders, shields, and formation controllers.
 * Ensures proper collision layer and mask assignment for the classic shooter mechanics.
 *
 * @packageDocumentation
 */

/**
 * Creates the player ship entity.
 * Includes input handling, health, and boundary constraints.
 */
export function createPlayer(world: World, x: number, y: number): Entity {
  const player = world.createEntity();
  world.addComponent(player, { type: "Transform", x, y });
  world.addComponent(player, { type: "Velocity", dx: 0, dy: 0 });
  world.addComponent(player, {
    type: "Render",
    shape: "player_ship",
    size: GAME_CONFIG.PLAYER_RENDER_WIDTH, // Using width as size for simplicity
    color: "#00FF00",
    rotation: 0,
  });
  world.addComponent(player, {
    type: "Collider2D",
    shape: { type: "circle", radius: GAME_CONFIG.PLAYER_COLLIDER_RADIUS },
    layer: CollisionLayers.PLAYER,
    mask: CollisionLayers.ENEMY | CollisionLayers.DEBRIS, // Enemy bullets or Invaders
    offsetX: 0,
    offsetY: 0,
    isTrigger: false,
    enabled: true
  } as Collider2DComponent);
  world.addComponent(player, {
    type: "Health",
    current: GAME_CONFIG.PLAYER_INITIAL_LIVES,
    max: GAME_CONFIG.PLAYER_INITIAL_LIVES,
    invulnerableRemaining: 0,
  });
  world.addComponent(player, {
    type: "Input",
    moveLeft: false,
    moveRight: false,
    shoot: false,
    shootCooldownRemaining: 0,
  });
  world.addComponent(player, { type: "Player" });
  world.addComponent(player, {
    type: "Boundary",
    width: GAME_CONFIG.SCREEN_WIDTH - GAME_CONFIG.PLAYER_RENDER_WIDTH,
    height: GAME_CONFIG.SCREEN_HEIGHT,
    x: GAME_CONFIG.PLAYER_RENDER_WIDTH / 2,
    y: 0,
    behavior: "bounce",
    bounceX: true,
    bounceY: false,
  } as BoundaryComponent);

  createEmitter(world, {
    position: { x, y },
    rate: 0,
    burst: 4,
    lifetime: { min: 1.0, max: 1.5 },
    speed: { min: 30, max: 60 },
    angle: { min: 260, max: 280 },
    size: { min: 2, max: 4 },
    color: ["#00FF00"],
    loop: false
  });

  return player;
}

/**
 * Creates a single invader entity.
 * Points are assigned based on the row (classic Space Invaders scoring).
 */
export function createInvader(world: World, x: number, y: number, row: number, col: number): Entity {
  const invader = world.createEntity();
  world.addComponent(invader, { type: "Transform", x, y });
  world.addComponent(invader, { type: "Velocity", dx: 0, dy: 0 });

  // Points based on row (classic: top rows more points)
  const points = (5 - row) * 10;

  world.addComponent(invader, {
    type: "Render",
    shape: "invader",
    size: 30,
    color: "#FFFFFF",
    rotation: 0,
  });
  world.addComponent(invader, {
    type: "Collider2D",
    shape: { type: "circle", radius: 15 },
    layer: CollisionLayers.ENEMY,
    mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE | CollisionLayers.DEBRIS, // Ship, Bullets, Shields
    offsetX: 0,
    offsetY: 0,
    isTrigger: false,
    enabled: true
  } as Collider2DComponent);
  world.addComponent(invader, { type: "Invader", row, col, points });
  return invader;
}

/**
 * Creates a player bullet using the pool.
 */
export function createPlayerBullet(world: World, x: number, y: number, pool: PlayerBulletPool): Entity {
  return pool.acquire(
    world,
    x,
    y,
    0,
    -GAME_CONFIG.PLAYER_BULLET_SPEED,
    GAME_CONFIG.PLAYER_BULLET_SIZE,
    "#00FF00",
    GAME_CONFIG.PLAYER_BULLET_TTL
  );
}

/**
 * Creates an enemy bullet using the pool.
 */
export function createEnemyBullet(world: World, x: number, y: number, pool: EnemyBulletPool): Entity {
  return pool.acquire(
    world,
    x,
    y,
    0,
    GAME_CONFIG.ENEMY_BULLET_SPEED,
    GAME_CONFIG.ENEMY_BULLET_SIZE,
    "#FF0000",
    GAME_CONFIG.ENEMY_BULLET_TTL
  );
}

/**
 * Creates a single destructible block of a shield/bunker.
 */
export function createShieldSegment(world: World, x: number, y: number, row: number, col: number): Entity {
  const segment = world.createEntity();
  world.addComponent(segment, { type: "Transform", x, y });
  world.addComponent(segment, {
    type: "Render",
    shape: "shield_block",
    size: 15,
    color: "#00FF00",
    rotation: 0,
  });
  world.addComponent(segment, {
    type: "Collider2D",
    shape: { type: "aabb", halfWidth: 7.5, halfHeight: 7.5 },
    layer: CollisionLayers.DEBRIS,
    mask: CollisionLayers.ENEMY | CollisionLayers.PROJECTILE, // Invaders or Bullets (Player & Enemy)
    offsetX: 0,
    offsetY: 0,
    isTrigger: false,
    enabled: true
  } as Collider2DComponent);
  world.addComponent(segment, {
    type: "Shield",
    hp: GAME_CONFIG.SHIELD_SEGMENT_HP,
    maxHp: GAME_CONFIG.SHIELD_SEGMENT_HP,
    segment: { row, col }
  });
  return segment;
}

/**
 * Creates the global game state entity.
 */
export function createGameState(world: World): Entity {
  const gameState = world.createEntity();
  world.addComponent(gameState, {
    type: "GameState",
    lives: GAME_CONFIG.PLAYER_INITIAL_LIVES,
    score: 0,
    level: 1,
    invadersRemaining: 0,
    isGameOver: false,
    combo: 0,
    multiplier: 1,
    comboTimerRemaining: 0,
    screenShake: null,
    kamikazesActive: 0,
  });
  return gameState;
}

/**
 * Creates the singleton entity that coordinates the invader grid movement.
 */
export function createFormationController(world: World): Entity {
  const controller = world.createEntity();
  world.addComponent(controller, {
    type: "Formation",
    direction: 1,
    stepDownPending: false,
    speed: GAME_CONFIG.INVADER_SPEED_BASE,
    descentStep: GAME_CONFIG.INVADER_DESCENT_STEP,
    leftBound: 0,
    rightBound: 0,
    fireCooldownRemaining: GAME_CONFIG.ENEMY_FIRE_INTERVAL_MIN,
  });
  return controller;
}

/**
 * Procedurally spawns a grid of invaders based on GAME_CONFIG spacing.
 */
export function spawnInvaderWave(world: World, _level: number): void {
  const startX = GAME_CONFIG.INVADER_START_X;
  const startY = GAME_CONFIG.INVADER_START_Y;
  const spacingX = GAME_CONFIG.INVADER_SPACING_X;
  const spacingY = GAME_CONFIG.INVADER_SPACING_Y;
  const rows = GAME_CONFIG.INVADER_ROWS;
  const cols = GAME_CONFIG.INVADER_COLS;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      createInvader(
        world,
        startX + col * spacingX,
        startY + row * spacingY,
        row,
        col
      );
    }
  }
}

/**
 * Spawns multiple composite bunkers made of individual shield segments.
 */
export function spawnShields(world: World): void {
  const count = GAME_CONFIG.SHIELD_COUNT;
  const segmentsX = GAME_CONFIG.SHIELD_SEGMENTS_X;
  const segmentsY = GAME_CONFIG.SHIELD_SEGMENTS_Y;
  const startY = GAME_CONFIG.SHIELD_START_Y;
  const spacing = GAME_CONFIG.SHIELD_SPACING;
  const segmentSize = 15;

  for (let i = 0; i < count; i++) {
    const bunkerX = 100 + i * spacing;
    for (let row = 0; row < segmentsY; row++) {
      for (let col = 0; col < segmentsX; col++) {
        // Simple rectangular bunker shape
        createShieldSegment(
          world,
          bunkerX + col * segmentSize,
          startY + row * segmentSize,
          row,
          col
        );
      }
    }
  }
}

/**
 * Creates a particle entity.
 */
export function createParticle(world: World, x: number, y: number, dx: number, dy: number, color: string, pool: ParticlePool): Entity {
  return pool.acquire(world, x, y, dx, dy, 2, color, GAME_CONFIG.PARTICLE_TTL_BASE);
}
