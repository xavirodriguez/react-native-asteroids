import { World } from "../../engine/core/World";
import { PONG_CONFIG } from "./types";
import { TransformComponent, VelocityComponent, RenderComponent, ColliderComponent, BoundaryComponent } from "../../engine/types/EngineTypes";

export const PongEntityFactory = {
  createBall(world: World) {
    const ball = world.createEntity();
    world.addComponent(ball, { type: "Transform", x: PONG_CONFIG.WIDTH / 2, y: PONG_CONFIG.HEIGHT / 2 } as TransformComponent);
    world.addComponent(ball, { type: "Velocity", dx: PONG_CONFIG.BALL_SPEED, dy: PONG_CONFIG.BALL_SPEED } as VelocityComponent);
    world.addComponent(ball, { type: "Render", shape: "circle", size: PONG_CONFIG.BALL_SIZE, color: "white", rotation: 0 } as RenderComponent);
    world.addComponent(ball, { type: "Collider", radius: PONG_CONFIG.BALL_SIZE / 2 } as ColliderComponent);
    world.addComponent(ball, { type: "Boundary", width: PONG_CONFIG.WIDTH, height: PONG_CONFIG.HEIGHT, mode: "bounce", bounceX: false, bounceY: true } as BoundaryComponent);
    return ball;
  },

  createPaddle(world: World, side: "left" | "right") {
    const paddle = world.createEntity();
    const x = side === "left" ? 50 : PONG_CONFIG.WIDTH - 50;
    world.addComponent(paddle, { type: "Transform", x, y: PONG_CONFIG.HEIGHT / 2 } as TransformComponent);
    world.addComponent(paddle, { type: "Velocity", dx: 0, dy: 0 } as VelocityComponent);
    world.addComponent(paddle, { type: "Render", shape: "polygon", size: PONG_CONFIG.PADDLE_WIDTH, color: "white", rotation: 0, vertices: [
      { x: -PONG_CONFIG.PADDLE_WIDTH / 2, y: -PONG_CONFIG.PADDLE_HEIGHT / 2 },
      { x: PONG_CONFIG.PADDLE_WIDTH / 2, y: -PONG_CONFIG.PADDLE_HEIGHT / 2 },
      { x: PONG_CONFIG.PADDLE_WIDTH / 2, y: PONG_CONFIG.PADDLE_HEIGHT / 2 },
      { x: -PONG_CONFIG.PADDLE_WIDTH / 2, y: PONG_CONFIG.PADDLE_HEIGHT / 2 },
    ] } as RenderComponent);
    world.addComponent(paddle, { type: "Collider", radius: PONG_CONFIG.PADDLE_HEIGHT / 2 } as ColliderComponent);
    return paddle;
  },

  createGameState(world: World) {
    const state = world.createEntity();
    world.addComponent(state, { type: "PongState", scoreP1: 0, scoreP2: 0, isGameOver: false } as any);
    return state;
  }
};
