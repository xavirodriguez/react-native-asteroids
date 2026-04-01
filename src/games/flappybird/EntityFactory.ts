import { World } from "../../engine/core/World";
import { Entity } from "../../engine/types/EngineTypes";
import { FLAPPY_CONFIG } from "./types/FlappyBirdTypes";

/**
 * Parameters for creating a bird entity.
 */
export interface CreateBirdParams {
  world: World;
  x: number;
  y: number;
}

/**
 * Parameters for creating a pipe entity.
 */
export interface CreatePipeParams {
  world: World;
  x: number;
  gapY: number;
}

/**
 * Creates the bird entity.
 */
export function createBird(options: CreateBirdParams): Entity {
  const { world, x, y } = options;
  const bird = world.createEntity();

  world.addComponent(bird, { type: "Position", x, y });
  world.addComponent(bird, { type: "Velocity", dx: 0, dy: 0 });
  world.addComponent(bird, {
    type: "Render",
    shape: "bird",
    size: FLAPPY_CONFIG.BIRD_RADIUS,
    color: "#FFD700",
    rotation: 0,
    trailPositions: [],
  });
  world.addComponent(bird, { type: "Collider", radius: FLAPPY_CONFIG.BIRD_RADIUS - 2 });
  world.addComponent(bird, {
    type: "Bird",
    velocityY: 0,
    isAlive: true,
  });
  world.addComponent(bird, {
    type: "FlappyInput",
    flap: false,
    flapCooldownRemaining: 0,
  });

  return bird;
}

/**
 * Creates pipe entities (top and bottom).
 */
export function createPipe(options: CreatePipeParams): void {
  const { world, x, gapY } = options;
  const halfGap = FLAPPY_CONFIG.GAP_SIZE / 2;
  const pipeWidth = FLAPPY_CONFIG.PIPE_WIDTH;
  const pipeSpeed = FLAPPY_CONFIG.PIPE_SPEED;

  // Top Pipe
  const topPipe = world.createEntity();
  const topY = gapY - halfGap;
  const topHeight = topY;

  world.addComponent(topPipe, { type: "Position", x, y: topY / 2 });
  world.addComponent(topPipe, { type: "Velocity", dx: -pipeSpeed, dy: 0 });
  world.addComponent(topPipe, {
    type: "Render",
    shape: "pipe",
    size: pipeWidth,
    color: "#2ecc71",
    rotation: 0,
    internalLines: [{ x1: 0, y1: 0, x2: pipeWidth, y2: topHeight }] // Just a placeholder for height
  });
  // Rectangular collision is usually better, but engine uses circles.
  // We'll approximate or use multiple circles if needed, but for now single circle.
  world.addComponent(topPipe, { type: "Collider", radius: pipeWidth / 2 });
  world.addComponent(topPipe, { type: "Pipe", gapY, gapSize: FLAPPY_CONFIG.GAP_SIZE, scored: false });

  // Bottom Pipe
  const bottomPipe = world.createEntity();
  const bottomY = gapY + halfGap;
  const bottomHeight = FLAPPY_CONFIG.SCREEN_HEIGHT - bottomY;

  world.addComponent(bottomPipe, { type: "Position", x, y: bottomY + bottomHeight / 2 });
  world.addComponent(bottomPipe, { type: "Velocity", dx: -pipeSpeed, dy: 0 });
  world.addComponent(bottomPipe, {
    type: "Render",
    shape: "pipe",
    size: pipeWidth,
    color: "#2ecc71",
    rotation: 0,
  });
  world.addComponent(bottomPipe, { type: "Collider", radius: pipeWidth / 2 });
  world.addComponent(bottomPipe, { type: "Pipe", gapY, gapSize: FLAPPY_CONFIG.GAP_SIZE, scored: true }); // Mark second part as already scored or just one
}

/**
 * Creates the ground entity.
 */
export function createGround(world: World): Entity {
  const ground = world.createEntity();
  world.addComponent(ground, { type: "Position", x: FLAPPY_CONFIG.SCREEN_WIDTH / 2, y: FLAPPY_CONFIG.GROUND_Y });
  world.addComponent(ground, { type: "Collider", radius: 20 }); // Simplified
  world.addComponent(ground, { type: "Ground" });
  world.addComponent(ground, {
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
export function createGameState(world: World): Entity {
  const gameState = world.createEntity();
  world.addComponent(gameState, {
    type: "FlappyState",
    score: 0,
    isGameOver: false,
    highScore: 0,
  });
  return gameState;
}
