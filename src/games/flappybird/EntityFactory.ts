import { World } from "../../engine/core/World";
import { Entity, Component } from "../../engine/types/EngineTypes";
import { FLAPPY_CONFIG } from "./types/FlappyBirdTypes";
import { createEmitter } from "../../engine/systems/ParticleSystem";
import { CollisionLayers } from "../../engine/physics/collision/CollisionLayers";
import { Collider2DComponent } from "../../engine/core/CoreComponents";
/**
 * Entity factory for the Flappy Bird game domain.
 *
 * Coordinates the creation of the bird, pipes, and ground.
 * Manages the spatial layout of pipes and ensures proper collision masking
 * for the "flap and avoid" gameplay.
 *
 * @packageDocumentation
 */

import { createInputBufferComponent } from "../../engine/types/InputBufferComponent";

/**
 * Helper to handle deferred or immediate entity creation and component attachment.
 */
const createBaseEntity = (world: World, deferred?: boolean): { entity: Entity, add: (comp: Component) => void } => {
    const isUpdating = world.isUpdating;
    const isDeferred = !!(deferred || isUpdating);
    const commands = world.getCommandBuffer();

    if (isDeferred) {
        const entity = world.reserveEntityId();
        commands.createEntity(entity);
        return {
            entity,
            add: (comp: Component) => {
                commands.addComponent(entity, comp);
            }
        };
    }

    const entity = world.createEntity();
    return {
        entity,
        add: (comp: Component) => world.addComponent(entity, comp)
    };
};

/**
 * Parameters for creating a bird entity.
 */
export interface CreateBirdParams {
  world: World;
  x: number;
  y: number;
  deferred?: boolean;
}

/**
 * Parameters for creating a pipe entity.
 */
export interface CreatePipeParams {
  world: World;
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

  add({ type: "Transform", x, y });
  add({ type: "Velocity", dx: 0, dy: 0 });
  add({
    type: "Render",
    shape: "bird",
    size: FLAPPY_CONFIG.BIRD_RADIUS,
    color: "#FFD700",
    rotation: 0,
  });
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
  add(createInputBufferComponent(80));
  // Adding HealthComponent as suggested for rendering check
  add({
    type: "Health",
    current: 1,
    max: 1,
    invulnerableRemaining: 0,
  });

  createEmitter(world, {
    position: { x, y },
    rate: 0,
    burst: 3,
    lifetime: { min: 0.8, max: 1.2 },
    speed: { min: 20, max: 40 },
    angle: { min: 260, max: 280 },
    size: { min: 3, max: 5 },
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
  const { entity: topPipe, add: addTop } = createBaseEntity(world, deferred);
  const topY = gapY - halfGap;
  addTop({ type: "Transform", x, y: topY / 2 });
  addTop({ type: "Velocity", dx: -pipeSpeed, dy: 0 });
  addTop({
    type: "Render",
    shape: "pipe",
    size: pipeWidth,
    color: "#2ecc71",
    rotation: 0,
  });
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
  const { entity: bottomPipe, add: addBottom } = createBaseEntity(world, deferred);
  const bottomY = gapY + halfGap;
  const bottomHeight = FLAPPY_CONFIG.SCREEN_HEIGHT - bottomY;
  addBottom({ type: "Transform", x, y: bottomY + bottomHeight / 2 });
  addBottom({ type: "Velocity", dx: -pipeSpeed, dy: 0 });
  addBottom({
    type: "Render",
    shape: "pipe",
    size: pipeWidth,
    color: "#2ecc71",
    rotation: 0,
  });
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
export function createGround(world: World, deferred?: boolean): Entity {
  const { entity: ground, add } = createBaseEntity(world, deferred);
  add({ type: "Transform", x: FLAPPY_CONFIG.SCREEN_WIDTH / 2, y: FLAPPY_CONFIG.GROUND_Y });
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
  });
  return ground;
}

/**
 * Creates the global game state entity.
 */
export function createGameState(world: World, deferred?: boolean): Entity {
  const { entity: gameState, add } = createBaseEntity(world, deferred);
  add({
    type: "FlappyState",
    score: 0,
    isGameOver: false,
    highScore: 0,
  });
  return gameState;
}
