import { World } from "@tiny-aster/core";
import { PONG_CONFIG } from "./types";
import { PongConfig } from "./types/PongConfigSchema";
import { TransformComponent, VelocityComponent, ColliderComponent } from "@tiny-aster/core";
import { CollisionLayers } from "../shared/types/CollisionLayers";

/**
 * Factoría para la creación de entidades de Pong.
 *
 * @responsibility Instanciar la bola, las paletas y el estado global con los componentes correctos.
 *
 * @remarks
 * Encapsula la configuración de dimensiones, velocidades iniciales y máscaras de colisión
 * necesarias para el comportamiento de rebote característico de Pong.
 */
export const PongEntityFactory = {
  /**
   * Creates the ball entity at the center of the screen.
   * Uses `gameplayRandom` to determine initial vertical direction.
   */
  createBall(world: World<any>) {
    const config = world.getResource<PongConfig>("GameConfig") || PONG_CONFIG;
    const ball = world.createEntity();
    world.addComponent(ball, { type: "Transform", x: config.WIDTH / 2, y: config.HEIGHT / 2, rotation: 0, scaleX: 1, scaleY: 1, worldX: config.WIDTH / 2, worldY: config.HEIGHT / 2, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: true } as TransformComponent);
    world.addComponent(ball, { type: "Velocity", vx: config.BALL_SPEED_START, vy: config.BALL_SPEED_START * (world.gameplayRandom.next() > 0.5 ? 1 : -1), angularVelocity: 0 } as VelocityComponent);
    world.addComponent(ball, { type: "Render", shape: "circle", size: config.BALL_SIZE, color: "white", rotation: 0, visible: true, opacity: 1, order: 0, angularVelocity: 0, hitFlashFrames: 0 } as any);
    world.addComponent(ball, {
      type: "Collider",
      shape: { type: "circle", radius: config.BALL_SIZE } as any,
      layer: CollisionLayers.PROJECTILE,
      mask: CollisionLayers.PLAYER,
      offsetX: 0,
      offsetY: 0,
      isTrigger: false,
      enabled: true
    } as ColliderComponent);
    // Classic Pong: Bounce only on Top/Bottom (Y), Score on Left/Right (X)
    world.addComponent(ball, {
      type: "Boundary",
      width: config.WIDTH,
      height: config.HEIGHT,
      mode: "bounce"
    } as any);
    world.addComponent(ball, { type: "Tag", tags: ["Ball"] } as any);
    world.addComponent(ball, { type: "Ball", spinFactor: 0, spinDecay: 0.02 } as any);
    return ball;
  },

  /**
   * Creates a paddle entity for either the left or right side.
   * @param world - ECS World.
   * @param side - Which side of the screen the paddle belongs to.
   */
  createPaddle(world: World<any>, side: "left" | "right") {
    const config = world.getResource<PongConfig>("GameConfig") || PONG_CONFIG;
    const paddle = world.createEntity();
    const x = side === "left" ? 40 : config.WIDTH - 40;
    const y = config.HEIGHT / 2;
    world.addComponent(paddle, { type: "Transform", x, y, rotation: 0, scaleX: 1, scaleY: 1, worldX: x, worldY: y, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: true } as TransformComponent);
    world.addComponent(paddle, { type: "Velocity", vx: 0, vy: 0, angularVelocity: 0 } as VelocityComponent);
    world.addComponent(paddle, { type: "Render", shape: "polygon", size: config.PADDLE_WIDTH, color: "white", rotation: 0, visible: true, opacity: 1, order: 0, angularVelocity: 0, hitFlashFrames: 0, vertices: [
      { x: -config.PADDLE_WIDTH / 2, y: -config.PADDLE_HEIGHT / 2 },
      { x: config.PADDLE_WIDTH / 2, y: -config.PADDLE_HEIGHT / 2 },
      { x: config.PADDLE_WIDTH / 2, y: config.PADDLE_HEIGHT / 2 },
      { x: -config.PADDLE_WIDTH / 2, y: config.PADDLE_HEIGHT / 2 },
    ] } as any);
    world.addComponent(paddle, {
      type: "Collider",
      shape: { type: "aabb", halfWidth: config.PADDLE_WIDTH / 2, halfHeight: config.PADDLE_HEIGHT / 2 } as any,
      layer: CollisionLayers.PLAYER,
      mask: CollisionLayers.PROJECTILE,
      offsetX: 0,
      offsetY: 0,
      isTrigger: false,
      enabled: true
    } as ColliderComponent);
    world.addComponent(paddle, { type: "Tag", tags: ["Paddle", side] } as any);
    world.addComponent(paddle, { type: "Paddle", side, previousY: y, lastVelocityY: 0 } as any);
    return paddle;
  },

  createGameState(world: World<any>) {
    const state = world.createEntity();
    world.addComponent(state, { type: "PongState", scoreP1: 0, scoreP2: 0, isGameOver: false, comboMultiplier: 1, gameOverLogged: false } as any);
    return state;
  }
};
