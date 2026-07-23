import { World } from "../../index";
import { Entity } from "../../index";
import { FLAPPY_CONFIG } from "./types/FlappyBirdTypes";
import { createEmitter } from "../../index";
import { CollisionLayers } from "../shared/types/CollisionLayers";
import { Collider2DComponent, TransformComponent, VelocityComponent, RenderComponent } from "../../index";

/**
 * Entity factory for the Flappy Bird game domain.
 *
 * Coordinates the creation of the bird, pipes, and ground.
 * Manages the spatial layout of pipes and ensures proper collision masking
 * for the "flap and avoid" gameplay.
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
 * Parameters for creating a bird entity.
 */
export interface CreateBirdParams {
  world: World<any>;
  x: number;
  y: number;
  deferred?: boolean;
}

/**
 * Parameters for creating a pipe entity.
 */
export interface CreatePipeParams {
  world: World<any>;
  x: number;
  gapY: number;
  deferred?: boolean;
}

/**
 * Crea la entidad del pájaro (jugador).
 *
 * @remarks
 * Incluye física de gravedad, manejo de entrada y un buffer de entrada especializado
 * para facilitar el timing del salto (jump timing).
 */
export function createBird(options: CreateBirdParams): Entity {
  const { world, x, y, deferred } = options;
  const { entity: bird, add } = createBaseEntity(world, deferred);

  add({ type: "Transform", x, y, rotation: 0, scaleX: 1, scaleY: 1, worldX: x, worldY: y, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false } as TransformComponent);
  add({ type: "Velocity", vx: 0, vy: 0, angularVelocity: 0 } as VelocityComponent);
  add({
    type: "Render",
    shape: "bird",
    size: FLAPPY_CONFIG.BIRD_RADIUS,
    color: "#FFD700",
    rotation: 0,
    visible: true,
    opacity: 1,
    order: 0,
    hitFlashFrames: 0,
    angularVelocity: 0
  } as RenderComponent);
  add({
    type: "Collider2D",
    shape: { type: "circle", radius: FLAPPY_CONFIG.BIRD_RADIUS - 2 },
    layer: CollisionLayers.PLAYER,
    mask: CollisionLayers.ENEMY | CollisionLayers.DEBRIS, // Pipe or Ground
    offsetX: 0,
    offsetY: 0,
    isTrigger: false,
    enabled: true
  } as Collider2DComponent);
  add({
    type: "Bird",
    velocityY: 0,
    isAlive: true,
    isGliding: false,
    nearMissTimer: 0,
  });
  add({
    type: "FlappyInput",
    flap: false,
    glide: false,
    flapCooldownRemaining: 0,
  });
  // Adding HealthComponent as suggested for rendering check
  add({
    type: "Health",
    current: 1,
    max: 1,
    invulnerableRemaining: 0,
  });

  createEmitter(world as any, {
    type: "spawn",
    x,
    y,
    rate: 0,
    burst: true,
    count: 3,
    lifetime: [0.8, 1.2],
    speed: [20, 40],
    angle: [260, 280],
    size: [3, 5],
    color: ["#FFD700"],
    loop: false
  });

  return bird;
}

/**
 * Creates a vertical pair of pipe entities (top and bottom).
 * @param options.gapY - The vertical center of the gap between pipes.
 */
export function createPipe(options: CreatePipeParams): void {
  const { world, x, gapY, deferred } = options;
  const halfGap = FLAPPY_CONFIG.GAP_SIZE / 2;
  const pipeWidth = FLAPPY_CONFIG.PIPE_WIDTH;
  const pipeSpeed = FLAPPY_CONFIG.PIPE_SPEED;

  // Top Pipe
  const { add: addTop } = createBaseEntity(world, deferred);
  const topY = gapY - halfGap;
  addTop({ type: "Transform", x, y: topY / 2, rotation: 0, scaleX: 1, scaleY: 1, worldX: x, worldY: topY / 2, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false } as TransformComponent);
  addTop({ type: "Velocity", vx: -pipeSpeed, vy: 0, angularVelocity: 0 } as VelocityComponent);
  addTop({
    type: "Render",
    shape: "pipe",
    size: pipeWidth,
    color: "#2ecc71",
    rotation: 0,
    visible: true,
    opacity: 1,
    order: 0,
    hitFlashFrames: 0,
    angularVelocity: 0
  } as RenderComponent);
  addTop({
    type: "Collider2D",
    shape: { type: "aabb", halfWidth: pipeWidth / 2, halfHeight: topY / 2 },
    layer: CollisionLayers.ENEMY,
    mask: CollisionLayers.PLAYER,
    offsetX: 0,
    offsetY: 0,
    isTrigger: false,
    enabled: true
  } as Collider2DComponent);
  addTop({ type: "Pipe", gapY, gapSize: FLAPPY_CONFIG.GAP_SIZE, scored: false });

  // Bottom Pipe
  const { add: addBottom } = createBaseEntity(world, deferred);
  const bottomY = gapY + halfGap;
  const bottomHeight = FLAPPY_CONFIG.SCREEN_HEIGHT - bottomY;
  addBottom({ type: "Transform", x, y: bottomY + bottomHeight / 2, rotation: 0, scaleX: 1, scaleY: 1, worldX: x, worldY: bottomY + bottomHeight / 2, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false } as TransformComponent);
  addBottom({ type: "Velocity", vx: -pipeSpeed, vy: 0, angularVelocity: 0 } as VelocityComponent);
  addBottom({
    type: "Render",
    shape: "pipe",
    size: pipeWidth,
    color: "#2ecc71",
    rotation: 0,
    visible: true,
    opacity: 1,
    order: 0,
    hitFlashFrames: 0,
    angularVelocity: 0
  } as RenderComponent);
  addBottom({
    type: "Collider2D",
    shape: { type: "aabb", halfWidth: pipeWidth / 2, halfHeight: bottomHeight / 2 },
    layer: CollisionLayers.ENEMY,
    mask: CollisionLayers.PLAYER,
    offsetX: 0,
    offsetY: 0,
    isTrigger: false,
    enabled: true
  } as Collider2DComponent);
  addBottom({ type: "Pipe", gapY, gapSize: FLAPPY_CONFIG.GAP_SIZE, scored: true });
}

/**
 * Creates the ground entity.
 */
export function createGround(world: World<any>, deferred?: boolean): Entity {
  const { entity: ground, add } = createBaseEntity(world, deferred);
  add({ type: "Transform", x: FLAPPY_CONFIG.SCREEN_WIDTH / 2, y: FLAPPY_CONFIG.GROUND_Y, rotation: 0, scaleX: 1, scaleY: 1, worldX: FLAPPY_CONFIG.SCREEN_WIDTH / 2, worldY: FLAPPY_CONFIG.GROUND_Y, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false } as TransformComponent);
  add({
    type: "Collider2D",
    shape: { type: "aabb", halfWidth: FLAPPY_CONFIG.SCREEN_WIDTH / 2, halfHeight: (FLAPPY_CONFIG.SCREEN_HEIGHT - FLAPPY_CONFIG.GROUND_Y) / 2 },
    layer: CollisionLayers.DEBRIS,
    mask: CollisionLayers.PLAYER,
    offsetX: 0,
    offsetY: 0,
    isTrigger: false,
    enabled: true
  } as Collider2DComponent);
  add({ type: "Ground" });
  add({
    type: "Render",
    shape: "ground",
    size: FLAPPY_CONFIG.SCREEN_WIDTH,
    color: "#deb887",
    rotation: 0,
    visible: true,
    opacity: 1,
    order: 0,
    hitFlashFrames: 0,
    angularVelocity: 0
  } as RenderComponent);
  return ground;
}

/**
 * Creates the global game state entity.
 */
export function createGameState(world: World<any>, deferred?: boolean): Entity {
  const { entity: gameState, add } = createBaseEntity(world, deferred);
  add({
    type: "FlappyState",
    score: 0,
    isGameOver: false,
    highScore: 0,
    pipeSpawnTimer: 0,
    gameOverLogged: false,
    comboMultiplier: 1,
  });
  return gameState;
}
