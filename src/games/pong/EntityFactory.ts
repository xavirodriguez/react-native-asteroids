import { World } from "../../engine/core/World";
import { PONG_CONFIG, PongState, BallComponent, PaddleComponent } from "./types";
import { Component, TransformComponent, VelocityComponent, RenderComponent, Collider2DComponent, BoundaryComponent, TagComponent, Entity } from "../../engine/types/EngineTypes";
import { CollisionLayers } from "../../engine/physics/collision/CollisionLayers";
import { RandomService } from "../../engine/utils/RandomService";


/**
 * Helper to handle deferred or immediate entity creation and component attachment.
 */
const createBaseEntity = (world: World): { entity: Entity, add: (comp: Component) => void } => {
    const isDeferred = world.isUpdating;
    const commands = world.getCommandBuffer();
    const entity = isDeferred ? world.reserveEntityId() : world.createEntity();

    if (isDeferred) {
        commands.createEntity(entity);
    }

    return {
        entity,
        add: (comp: Component) => {
            if (isDeferred) {
                commands.addComponent(entity, comp);
            } else {
                world.addComponent(entity, comp);
            }
        }
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
  createBall(world: World) {
    const { entity: ball, add } = createBaseEntity(world);
    add({ type: "Transform", x: PONG_CONFIG.WIDTH / 2, y: PONG_CONFIG.HEIGHT / 2, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
    add({ type: "Velocity", dx: PONG_CONFIG.BALL_SPEED_START, dy: PONG_CONFIG.BALL_SPEED_START * (RandomService.getGameplayRandom().next() > 0.5 ? 1 : -1) } as VelocityComponent);
    add({ type: "Render", shape: "circle", size: PONG_CONFIG.BALL_SIZE, color: "white", rotation: 0 } as RenderComponent);
    add({
      type: "Collider2D",
      shape: { type: "circle", radius: PONG_CONFIG.BALL_SIZE },
      layer: CollisionLayers.PROJECTILE,
      mask: CollisionLayers.PLAYER,
      offsetX: 0,
      offsetY: 0,
      isTrigger: false,
      enabled: true
    } as Collider2DComponent);
    add({ type: "Boundary", width: PONG_CONFIG.WIDTH, height: PONG_CONFIG.HEIGHT, behavior: "bounce", bounceX: false, bounceY: true } as BoundaryComponent);
    add({ type: "Tag", tags: ["Ball"] } as TagComponent);
    add({ type: "Ball", spinFactor: 0, spinDecay: 0.02 } as BallComponent);
    return ball;
  },

  /**
   * Creates a paddle entity for either the left or right side.
   * @param world - ECS World.
   * @param side - Which side of the screen the paddle belongs to.
   */
  createPaddle(world: World, side: "left" | "right") {
    const { entity: paddle, add } = createBaseEntity(world);
    const x = side === "left" ? 40 : PONG_CONFIG.WIDTH - 40;
    const y = PONG_CONFIG.HEIGHT / 2;
    add({ type: "Transform", x, y, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
    add({ type: "Velocity", dx: 0, dy: 0 } as VelocityComponent);
    add({ type: "Render", shape: "polygon", size: PONG_CONFIG.PADDLE_WIDTH, color: "white", rotation: 0, vertices: [
      { x: -PONG_CONFIG.PADDLE_WIDTH / 2, y: -PONG_CONFIG.PADDLE_HEIGHT / 2 },
      { x: PONG_CONFIG.PADDLE_WIDTH / 2, y: -PONG_CONFIG.PADDLE_HEIGHT / 2 },
      { x: PONG_CONFIG.PADDLE_WIDTH / 2, y: PONG_CONFIG.PADDLE_HEIGHT / 2 },
      { x: -PONG_CONFIG.PADDLE_WIDTH / 2, y: PONG_CONFIG.PADDLE_HEIGHT / 2 },
    ] } as RenderComponent);
    add({
      type: "Collider2D",
      shape: { type: "aabb", halfWidth: PONG_CONFIG.PADDLE_WIDTH / 2, halfHeight: PONG_CONFIG.PADDLE_HEIGHT / 2 },
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

  createGameState(world: World) {
    const { entity: state, add } = createBaseEntity(world);
    add({ type: "PongState", scoreP1: 0, scoreP2: 0, isGameOver: false, comboMultiplier: 1, gameOverLogged: false } as PongState);
    return state;
  }
};
