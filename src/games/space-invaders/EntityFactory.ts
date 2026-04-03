import { World } from "../../engine/core/World";
import { Entity } from "../../engine/types/EngineTypes";
import { GAME_CONFIG } from "./types/SpaceInvadersTypes";
import { PlayerBulletPool, EnemyBulletPool, ParticlePool } from "./EntityPool";

/**
 * Creates the player entity.
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
  world.addComponent(player, { type: "Collider", radius: GAME_CONFIG.PLAYER_COLLIDER_RADIUS });
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
  return player;
}

/**
 * Creates an invader entity.
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
  world.addComponent(invader, { type: "Collider", radius: 15 });
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
 * Creates a shield segment entity.
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
  world.addComponent(segment, { type: "Collider", radius: 8 });
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
    screenShake: null,
  });
  return gameState;
}

/**
 * Creates the formation controller entity.
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
 * Spawns a full wave of invaders.
 */
export function spawnInvaderWave(world: World, level: number): void {
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
 * Spawns the bunkers/shields.
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
