import { World } from "../../engine";
import { PONG_CONFIG, PongState } from "./types";
import { Component, TransformComponent, VelocityComponent, RenderComponent, Collider2DComponent, BoundaryComponent, TagComponent } from "../../engine/EngineTypes";
import { CollisionLayers } from "../../engine/physics2d/CollisionLayers";
import { RandomService } from "../../engine/RandomService";

export interface BallComponent extends Component {
  type: "Ball";
  spinFactor: number;
  spinDecay: number;
}

export interface PaddleComponent extends Component {
  type: "Paddle";
  side: "left" | "right";
  previousY: number;
  lastVelocityY: number;
}

export interface PongStateComponent extends Component, PongState {
  type: "PongState";
}

export const PongEntityFactory = {
  createBall(world: World) {
    const ball = world.createEntity();
    world.addComponent(ball, { type: "Transform", x: PONG_CONFIG.WIDTH / 2, y: PONG_CONFIG.HEIGHT / 2, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
    world.addComponent(ball, { type: "Velocity", dx: PONG_CONFIG.BALL_SPEED_START, dy: PONG_CONFIG.BALL_SPEED_START * (RandomService.getGameplayRandom().next() > 0.5 ? 1 : -1) } as VelocityComponent);
    world.addComponent(ball, { type: "Render", shape: "circle", size: PONG_CONFIG.BALL_SIZE, color: "white", rotation: 0 } as RenderComponent);
    world.addComponent(ball, {
      type: "Collider2D",
      shape: { type: "circle", radius: PONG_CONFIG.BALL_SIZE },
      layer: CollisionLayers.PROJECTILE,
      mask: CollisionLayers.PLAYER,
      offsetX: 0,
      offsetY: 0,
      isTrigger: false,
      enabled: true
    } as Collider2DComponent);
    world.addComponent(ball, { type: "Boundary", width: PONG_CONFIG.WIDTH, height: PONG_CONFIG.HEIGHT, behavior: "bounce", bounceX: false, bounceY: true } as BoundaryComponent);
    world.addComponent(ball, { type: "Tag", tags: ["Ball"] } as TagComponent);
    world.addComponent(ball, { type: "Ball", spinFactor: 0, spinDecay: 0.02 } as BallComponent);
    return ball;
  },

  createPaddle(world: World, side: "left" | "right") {
    const paddle = world.createEntity();
    const x = side === "left" ? 40 : PONG_CONFIG.WIDTH - 40;
    const y = PONG_CONFIG.HEIGHT / 2;
    world.addComponent(paddle, { type: "Transform", x, y, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
    world.addComponent(paddle, { type: "Velocity", dx: 0, dy: 0 } as VelocityComponent);
    world.addComponent(paddle, { type: "Render", shape: "polygon", size: PONG_CONFIG.PADDLE_WIDTH, color: "white", rotation: 0, vertices: [
      { x: -PONG_CONFIG.PADDLE_WIDTH / 2, y: -PONG_CONFIG.PADDLE_HEIGHT / 2 },
      { x: PONG_CONFIG.PADDLE_WIDTH / 2, y: -PONG_CONFIG.PADDLE_HEIGHT / 2 },
      { x: PONG_CONFIG.PADDLE_WIDTH / 2, y: PONG_CONFIG.PADDLE_HEIGHT / 2 },
      { x: -PONG_CONFIG.PADDLE_WIDTH / 2, y: PONG_CONFIG.PADDLE_HEIGHT / 2 },
    ] } as RenderComponent);
    world.addComponent(paddle, {
      type: "Collider2D",
      shape: { type: "aabb", halfWidth: PONG_CONFIG.PADDLE_WIDTH / 2, halfHeight: PONG_CONFIG.PADDLE_HEIGHT / 2 },
      layer: CollisionLayers.PLAYER,
      mask: CollisionLayers.PROJECTILE,
      offsetX: 0,
      offsetY: 0,
      isTrigger: false,
      enabled: true
    } as Collider2DComponent);
    world.addComponent(paddle, { type: "Tag", tags: ["Paddle", side] } as TagComponent);
    world.addComponent(paddle, { type: "Paddle", side, previousY: y, lastVelocityY: 0 } as PaddleComponent);
    return paddle;
  },

  createGameState(world: World) {
    const state = world.createEntity();
    world.addComponent(state, { type: "PongState", scoreP1: 0, scoreP2: 0, isGameOver: false, comboMultiplier: 1 } as PongStateComponent);
    return state;
  }
};
