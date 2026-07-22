import { World } from "../../ecs/World";
import { TransformComponent, VelocityComponent, RenderComponent, HealthComponent, TTLComponent } from "../../ecs/CoreComponents";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "./types/AsteroidRegistry";

/** @public */
export const createShip = (config: { world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, x: number, y: number }): number => {
    const entity = config.world.createEntity();

    config.world.addComponent(entity, {
        type: "Transform",
        x: config.x,
        y: config.y,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: config.x,
        worldY: config.y,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: true
    } as TransformComponent);

    config.world.addComponent(entity, {
        type: "Velocity",
        vx: 0,
        vy: 0,
        angularVelocity: 0
    } as VelocityComponent);

    config.world.addComponent(entity, {
        type: "Render",
        visible: true,
        opacity: 1,
        order: 1,
        rotation: 0,
        angularVelocity: 0,
        hitFlashFrames: 0
    } as RenderComponent);

    config.world.addComponent(entity, {
        type: "Health",
        current: 3,
        max: 3
    } as HealthComponent);

    return entity;
};

/** @public */
export function createBullet(
  worldOrConfig: World<AsteroidsComponentRegistry, AsteroidsEventRegistry> | {
    world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>;
    x: number;
    y: number;
    rotation: number;
    speed: number;
    ownerId?: string;
    ttl?: number;
  },
  x?: number,
  y?: number,
  rotation?: number,
  speed?: number,
  ownerId?: string,
  ttl?: number
): number {
  let world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>;
  let posX: number;
  let posY: number;
  let rot: number;
  let spd: number;
  let owner: string | undefined;
  let life: number;

  if (worldOrConfig instanceof World) {
    world = worldOrConfig;
    posX = x!;
    posY = y!;
    rot = rotation!;
    spd = speed!;
    owner = ownerId;
    life = ttl ?? 2;
  } else {
    world = worldOrConfig.world;
    posX = worldOrConfig.x;
    posY = worldOrConfig.y;
    rot = worldOrConfig.rotation;
    spd = worldOrConfig.speed;
    owner = worldOrConfig.ownerId;
    life = worldOrConfig.ttl ?? 2;
  }

  const entity = world.createEntity();

  world.addComponent(entity, {
    type: "Transform",
    x: posX,
    y: posY,
    rotation: rot,
    scaleX: 1,
    scaleY: 1,
    worldX: posX,
    worldY: posY,
    worldRotation: rot,
    worldScaleX: 1,
    worldScaleY: 1,
    dirty: true
  } as TransformComponent);

  world.addComponent(entity, {
    type: "Velocity",
    vx: Math.cos(rot) * spd,
    vy: Math.sin(rot) * spd,
    angularVelocity: 0
  } as VelocityComponent);

  world.addComponent(entity, {
    type: "Render",
    visible: true,
    opacity: 1,
    order: 1,
    rotation: rot,
    angularVelocity: 0,
    hitFlashFrames: 0
  } as RenderComponent);

  world.addComponent(entity, {
    type: "Bullet",
    ownerId: owner
  } as AsteroidsComponentRegistry["Bullet"]);

  world.addComponent(entity, {
    type: "TTL",
    timeLeft: life,
    remaining: life
  } as TTLComponent);

  return entity;
}

/** @public */
export const createAsteroid = (config: { world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, x: number, y: number, size: string }): number => {
    const entity = config.world.createEntity();

    config.world.addComponent(entity, {
        type: "Transform",
        x: config.x,
        y: config.y,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: config.x,
        worldY: config.y,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: true
    } as TransformComponent);

    config.world.addComponent(entity, {
        type: "Velocity",
        vx: (config.world.gameplayRandom.next() - 0.5) * 100,
        vy: (config.world.gameplayRandom.next() - 0.5) * 100,
        angularVelocity: (config.world.gameplayRandom.next() - 0.5) * 2
    } as VelocityComponent);

    config.world.addComponent(entity, {
        type: "Asteroid",
        size: config.size
    } as AsteroidsComponentRegistry["Asteroid"]);

    config.world.addComponent(entity, {
        type: "Render",
        visible: true,
        opacity: 1,
        order: 0,
        rotation: 0,
        angularVelocity: 0,
        hitFlashFrames: 0
    } as RenderComponent);

    return entity;
};
