import { World } from "../../engine/core/World";
import { PongState, BallComponent, PaddleComponent, PONG_CONFIG } from "./types";
import { PongConfig } from "./types/PongConfigSchema";
import { Component, TransformComponent, VelocityComponent, RenderComponent, Collider2DComponent, BoundaryComponent, TagComponent, Entity } from "../../engine/types/EngineTypes";
import { CollisionLayers } from "../../engine/physics/collision/CollisionLayers";


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
  createBall(world: World, deferred?: boolean) {
    const config = world.getResource<PongConfig>("GameConfig") || PONG_CONFIG;
    const { entity: ball, add } = createBaseEntity(world, deferred);
    add({ type: "Transform", x: config.WIDTH / 2, y: config.HEIGHT / 2, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
    add({ type: "Velocity", dx: config.BALL_SPEED_START, dy: config.BALL_SPEED_START * (world.gameplayRandom.next() > 0.5 ? 1 : -1) } as VelocityComponent);
    add({ type: "Render", shape: "circle", size: config.BALL_SIZE, color: "white", rotation: 0 } as RenderComponent);
    add({
      type: "Collider2D",
      shape: { type: "circle", radius: config.BALL_SIZE },
      layer: CollisionLayers.PROJECTILE,
      mask: CollisionLayers.PLAYER,
      offsetX: 0,
      offsetY: 0,
      isTrigger: false,
      enabled: true
    } as Collider2DComponent);
    // Classic Pong: Bounce only on Top/Bottom (Y), Score on Left/Right (X)
    add({
      type: "Boundary",
      width: config.WIDTH,
      height: config.HEIGHT,
      behavior: "bounce",
      bounceX: false,
      bounceY: true
    } as BoundaryComponent);
    add({ type: "Tag", tags: ["Ball"] } as TagComponent);
    add({ type: "Ball", spinFactor: 0, spinDecay: 0.02 } as BallComponent);
    return ball;
  },

  /**
   * Creates a paddle entity for either the left or right side.
   * @param world - ECS World.
   * @param side - Which side of the screen the paddle belongs to.
   */
  createPaddle(world: World, side: "left" | "right", deferred?: boolean) {
    const config = world.getResource<PongConfig>("GameConfig") || PONG_CONFIG;
    const { entity: paddle, add } = createBaseEntity(world, deferred);
    const x = side === "left" ? 40 : config.WIDTH - 40;
    const y = config.HEIGHT / 2;
    add({ type: "Transform", x, y, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
    add({ type: "Velocity", dx: 0, dy: 0 } as VelocityComponent);
    add({ type: "Render", shape: "polygon", size: config.PADDLE_WIDTH, color: "white", rotation: 0, vertices: [
      { x: -config.PADDLE_WIDTH / 2, y: -config.PADDLE_HEIGHT / 2 },
      { x: config.PADDLE_WIDTH / 2, y: -config.PADDLE_HEIGHT / 2 },
      { x: config.PADDLE_WIDTH / 2, y: config.PADDLE_HEIGHT / 2 },
      { x: -config.PADDLE_WIDTH / 2, y: config.PADDLE_HEIGHT / 2 },
    ] } as RenderComponent);
    add({
      type: "Collider2D",
      shape: { type: "aabb", halfWidth: config.PADDLE_WIDTH / 2, halfHeight: config.PADDLE_HEIGHT / 2 },
      layer: CollisionLayers.PLAYER,
      mask: CollisionLayers.PROJECTILE,
      offsetX: 0,
      offsetY: 0,
      isTrigger: false,
      enabled: true
    } as Collider2DComponent);
    add({ type: "Tag", tags: ["Paddle", side] } as TagComponent);
    add({ type: "Paddle", side, previousY: y, lastVelocityY: 0 } as PaddleComponent);
    return paddle;
  },

  createGameState(world: World, deferred?: boolean) {
    const { entity: state, add } = createBaseEntity(world, deferred);
    add({ type: "PongState", scoreP1: 0, scoreP2: 0, isGameOver: false, comboMultiplier: 1, gameOverLogged: false } as PongState);
    return state;
  }
};
