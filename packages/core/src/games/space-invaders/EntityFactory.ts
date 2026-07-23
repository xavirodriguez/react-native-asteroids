import { World } from "../../index";
import { Entity } from "../../index";
import { SpaceInvadersConfig } from "./types/SpaceInvadersConfigSchema";
import { GAME_CONFIG } from "./types/SpaceInvadersTypes";
import { PlayerBulletPool, EnemyBulletPool, ParticlePool } from "./EntityPool";
import { createEmitter } from "../../index";
import { CollisionLayers } from "../shared/types/CollisionLayers";
import { Collider2DComponent, TransformComponent, VelocityComponent, RenderComponent, HealthComponent } from "../../index";
import {
  InputComponent,
  PlayerComponent,
  InvaderComponent,
  ShieldComponent,
  GameStateComponent,
  FormationComponent,
} from "./types/SpaceInvadersTypes";
import { EnemyFactory } from "./EnemyFactory";

/**
 * Entity factory for the Space Invaders game domain.
 *
 * Coordinates the creation of players, invaders, shields, and formation controllers.
 * Ensures proper collision layer and mask assignment for the classic shooter mechanics.
 *
 * @packageDocumentation
 */

/**
 * Helper to handle deferred or immediate entity creation and component attachment.
 */
const createBaseEntity = (world: World<any>, deferred?: boolean): { entity: Entity, add: (comp: any) => void } => {
    const isUpdating = world.isUpdating;
    const isDeferred = !!(deferred || isUpdating);
    const commands = world.getCommandBuffer();

    if (isDeferred) {
        const entity = world.reserveEntityId();
        commands.createEntity(entity);
        return {
            entity,
            add: (comp: any) => {
                commands.addComponent(entity, comp);
            }
        };
    }

    const entity = world.createEntity();
    return {
        entity,
        add: (comp: any) => world.addComponent(entity, comp)
    };
};

/**
 * Creates the player ship entity.
 * Includes input handling, health, and boundary constraints.
 */
export function createPlayer(world: World<any>, x: number, y: number, deferred?: boolean): Entity {
  const config = world.getResource<SpaceInvadersConfig>("GameConfig") || GAME_CONFIG;
  const { entity: player, add } = createBaseEntity(world, deferred);
  add({ type: "Transform", x, y, rotation: 0, scaleX: 1, scaleY: 1, worldX: x, worldY: y, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false } as TransformComponent);
  add({ type: "Velocity", vx: 0, vy: 0, angularVelocity: 0 } as VelocityComponent);
  add({
    type: "Render",
    shape: "player_ship",
    size: config.PLAYER_RENDER_WIDTH, // Using width as size for simplicity
    color: "#00FF00",
    rotation: 0,
    visible: true,
    opacity: 1,
    order: 0,
    hitFlashFrames: 0,
    angularVelocity: 0
  } as RenderComponent);
  add({
    type: "Collider2D",
    shape: { type: "circle", radius: config.PLAYER_COLLIDER_RADIUS },
    layer: CollisionLayers.PLAYER,
    mask: CollisionLayers.ENEMY | CollisionLayers.DEBRIS, // Enemy bullets or Invaders
    offsetX: 0,
    offsetY: 0,
    isTrigger: false,
    enabled: true
  } as Collider2DComponent);
  add({
    type: "Health",
    current: config.PLAYER_INITIAL_LIVES,
    max: config.PLAYER_INITIAL_LIVES,
    invulnerableRemaining: 0,
  } as HealthComponent);
  add({
    type: "Input",
    moveLeft: false,
    moveRight: false,
    shoot: false,
    shootCooldownRemaining: 0,
  } as InputComponent);
  add({ type: "Player" } as PlayerComponent);
  add({
    type: "Boundary",
    width: GAME_CONFIG.SCREEN_WIDTH - config.PLAYER_RENDER_WIDTH,
    height: GAME_CONFIG.SCREEN_HEIGHT,
    mode: "bounce"
  } as any);

  createEmitter(world as any, {
    type: "spawn",
    x,
    y,
    rate: 0,
    burst: true,
    count: 4,
    lifetime: [1.0, 1.5],
    speed: [30, 60],
    angle: [260, 280],
    size: [2, 4],
    color: ["#00FF00"],
    loop: false
  });

  return player;
}

/**
 * Creates a single invader entity using the Data-Driven EnemyFactory.
 * Points are assigned based on the row (classic Space Invaders scoring).
 */
export function createInvader(world: World<any>, x: number, y: number, row: number, col: number, deferred?: boolean): Entity {
  // Use "invader_commander" for top row, "invader_scout" for others
  const blueprintId = row === 0 ? "invader_commander" : "invader_scout";

  const invader = EnemyFactory.createEnemy(world, blueprintId, x, y, {}, deferred);

  // Handle deferred additions if world is updating or deferred flag is set
  const isDeferred = !!(deferred || world.isUpdating);
  const add = (comp: any) => {
    if (isDeferred) {
      world.getCommandBuffer().addComponent(invader, comp);
    } else {
      world.addComponent(invader, comp);
    }
  };

  // Points based on row (classic: top rows more points)
  const points = (5 - row) * 10;

  // Add game-specific Invader component that was previously part of the manual factory
  add({ type: "Invader", row, col, points } as InvaderComponent);

  // 10% chance to have a loot table (matching standard LootSystem logic)
  add({
    type: "LootTable",
    tableId: "invader",
    drops: [
      { type: "speed", chance: 0.05, config: { value: 1.5, duration: 5000 } },
      { type: "triple_shot", chance: 0.05, config: { duration: 8000 } }
    ]
  } as any);

  return invader;
}

/**
 * Creates a player bullet using the pool.
 */
export function createPlayerBullet(world: World<any>, x: number, y: number, pool: PlayerBulletPool): Entity {
  const config = world.getResource<SpaceInvadersConfig>("GameConfig") || GAME_CONFIG;
  return pool.acquire(
    world,
    {
        x,
        y,
        dx: 0,
        dy: -config.PLAYER_BULLET_SPEED,
        size: config.PLAYER_BULLET_SIZE,
        color: "#00FF00",
        ttl: config.PLAYER_BULLET_TTL
    }
  );
}

/**
 * Creates an enemy bullet using the pool.
 */
export function createEnemyBullet(world: World<any>, x: number, y: number, pool: EnemyBulletPool): Entity {
  const config = world.getResource<SpaceInvadersConfig>("GameConfig") || GAME_CONFIG;
  return pool.acquire(
    world,
    {
        x,
        y,
        dx: 0,
        dy: config.ENEMY_BULLET_SPEED,
        size: config.ENEMY_BULLET_SIZE,
        color: "#FF0000",
        ttl: config.ENEMY_BULLET_TTL
    }
  );
}

/**
 * Creates a single destructible block of a shield/bunker.
 */
export function createShieldSegment(world: World<any>, x: number, y: number, row: number, col: number, deferred?: boolean): Entity {
  const config = world.getResource<SpaceInvadersConfig>("GameConfig") || GAME_CONFIG;
  const { entity: segment, add } = createBaseEntity(world, deferred);
  add({ type: "Transform", x, y, rotation: 0, scaleX: 1, scaleY: 1, worldX: x, worldY: y, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false } as TransformComponent);
  add({
    type: "Render",
    shape: "shield_block",
    size: 15,
    color: "#00FF00",
    rotation: 0,
    visible: true,
    opacity: 1,
    order: 0,
    hitFlashFrames: 0,
    angularVelocity: 0
  } as RenderComponent);
  add({
    type: "Collider2D",
    shape: { type: "aabb", halfWidth: 7.5, halfHeight: 7.5 },
    layer: CollisionLayers.DEBRIS,
    mask: CollisionLayers.ENEMY | CollisionLayers.PROJECTILE, // Invaders or Bullets (Player & Enemy)
    offsetX: 0,
    offsetY: 0,
    isTrigger: false,
    enabled: true
  } as Collider2DComponent);
  add({
    type: "Shield",
    hp: config.SHIELD_SEGMENT_HP,
    maxHp: config.SHIELD_SEGMENT_HP,
    segment: { row, col }
  } as ShieldComponent);
  return segment;
}

/**
 * Creates the global game state entity.
 */
export function createGameState(world: World<any>, deferred?: boolean): Entity {
  const config = world.getResource<SpaceInvadersConfig>("GameConfig") || GAME_CONFIG;
  const { entity: gameState, add } = createBaseEntity(world, deferred);
  add({
    type: "GameState",
    lives: config.PLAYER_INITIAL_LIVES,
    score: 0,
    level: 1,
    invadersRemaining: 0,
    isGameOver: false,
    combo: 0,
    multiplier: 1,
    comboTimerRemaining: 0,
    screenShake: null,
    kamikazesActive: 0,
  } as GameStateComponent);
  return gameState;
}

/**
 * Creates the singleton entity that coordinates the invader grid movement.
 */
export function createFormationController(world: World<any>, deferred?: boolean): Entity {
  const config = world.getResource<SpaceInvadersConfig>("GameConfig") || GAME_CONFIG;
  const { entity: controller, add } = createBaseEntity(world, deferred);
  add({
    type: "Formation",
    direction: 1,
    stepDownPending: false,
    speed: config.INVADER_SPEED_BASE,
    descentStep: config.INVADER_DESCENT_STEP,
    leftBound: 0,
    rightBound: 0,
    fireCooldownRemaining: config.ENEMY_FIRE_INTERVAL_MIN,
  } as FormationComponent);
  return controller;
}

/**
 * Procedurally spawns a grid of invaders based on GAME_CONFIG spacing.
 */
export function spawnInvaderWave(world: World<any>, _level: number, deferred?: boolean): void {
  const config = world.getResource<SpaceInvadersConfig>("GameConfig") || GAME_CONFIG;
  const startX = config.INVADER_START_X;
  const startY = config.INVADER_START_Y;
  const spacingX = config.INVADER_SPACING_X;
  const spacingY = config.INVADER_SPACING_Y;
  const rows = config.INVADER_ROWS;
  const cols = config.INVADER_COLS;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      createInvader(
        world,
        startX + col * spacingX,
        startY + row * spacingY,
        row,
        col,
        deferred
      );
    }
  }
}

/**
 * Spawns multiple composite bunkers made of individual shield segments.
 */
export function spawnShields(world: World<any>, deferred?: boolean): void {
  const config = world.getResource<SpaceInvadersConfig>("GameConfig") || GAME_CONFIG;
  const count = config.SHIELD_COUNT;
  const segmentsX = config.SHIELD_SEGMENTS_X;
  const segmentsY = config.SHIELD_SEGMENTS_Y;
  const startY = config.SHIELD_START_Y;
  const spacing = config.SHIELD_SPACING;

  for (let i = 0; i < count; i++) {
    const bunkerX = config.SHIELD_START_X + i * spacing;
    for (let row = 0; row < segmentsY; row++) {
      for (let col = 0; col < segmentsX; col++) {
        // Simple rectangular bunker shape
        createShieldSegment(
          world,
          bunkerX + col * config.SHIELD_SEGMENT_SIZE,
          startY + row * config.SHIELD_SEGMENT_SIZE,
          row,
          col,
          deferred
        );
      }
    }
  }
}

/**
 * Creates a particle entity.
 */
export function createParticle(world: World<any>, x: number, y: number, dx: number, dy: number, color: string, pool: ParticlePool): Entity {
  const config = world.getResource<SpaceInvadersConfig>("GameConfig") || GAME_CONFIG;
  return pool.acquire(world, { x, y, dx, dy, size: 2, color, ttl: config.PARTICLE_TTL_BASE });
}
