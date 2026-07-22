import { World } from "../../ecs/World";
import { TransformComponent, VelocityComponent, RenderComponent, HealthComponent, TTLComponent } from "../../ecs/CoreComponents";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "./types/AsteroidRegistry";
import { CollisionLayers } from "../shared/types/CollisionLayers";
import { ShapeType } from "../../physics/shapes/Shapes";
import { AsteroidConfig } from "./types/AsteroidConfigSchema";

const createBaseEntity = (world: World<any>): { entity: number, add: (comp: any) => void } => {
    const isUpdating = world.isUpdating;
    const commands = world.getCommandBuffer();

    if (isUpdating) {
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

/** @public */
export const createShip = (config: { world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, x: number, y: number }): number => {
    const { entity, add } = createBaseEntity(config.world);
    const screen = config.world.getResource<{ width: number, height: number }>("ScreenConfig") || { width: 800, height: 600 };

    add({
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

    add({
        type: "Velocity",
        vx: 0,
        vy: 0,
        angularVelocity: 0
    } as VelocityComponent);

    add({
        type: "Render",
        visible: true,
        opacity: 1,
        order: 1,
        rotation: 0,
        angularVelocity: 0,
        hitFlashFrames: 0
    } as RenderComponent);

    add({
        type: "Health",
        current: 3,
        max: 3
    } as HealthComponent);

    add({
        type: "Collider",
        shape: { type: ShapeType.Circle, radius: 15 },
        layer: CollisionLayers.PLAYER,
        mask: CollisionLayers.ENEMY,
        enabled: true,
        isTrigger: false
    } as ColliderComponent);

    add({
        type: "CollisionEvents",
        collisions: [],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: []
    } as CollisionEventsComponent);

    add({
        type: "Boundary",
        width: screen.width,
        height: screen.height,
        mode: "wrap"
    } as any);

    add({
        type: "Ship",
        sessionId: "",
        shootCooldownRemaining: 0
    } as any);

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
    const { entity, add } = createBaseEntity(config.world);
    const screen = config.world.getResource<{ width: number, height: number }>("ScreenConfig") || { width: 800, height: 600 };

    add({
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

    add({
        type: "Velocity",
        vx: (config.world.gameplayRandom.next() - 0.5) * 100,
        vy: (config.world.gameplayRandom.next() - 0.5) * 100,
        angularVelocity: (config.world.gameplayRandom.next() - 0.5) * 2
    } as VelocityComponent);

    add({
        type: "Asteroid",
        size: config.size
    } as AsteroidsComponentRegistry["Asteroid"]);

    add({
        type: "Render",
        visible: true,
        opacity: 1,
        order: 0,
        rotation: 0,
        angularVelocity: 0,
        hitFlashFrames: 0
    } as RenderComponent);

    let radius = 40;
    if (config.size === "medium") radius = 20;
    else if (config.size === "small") radius = 10;

    add({
        type: "Collider",
        shape: { type: ShapeType.Circle, radius },
        layer: CollisionLayers.ENEMY,
        mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE,
        enabled: true,
        isTrigger: false
    } as ColliderComponent);

    add({
        type: "CollisionEvents",
        collisions: [],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: []
    } as CollisionEventsComponent);

    add({
        type: "Boundary",
        width: screen.width,
        height: screen.height,
        mode: "wrap"
    } as any);

    return entity;
};

/** @public */
export const createBullet = (config: {
    world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>;
    x: number;
    y: number;
    vx: number;
    vy: number;
    ownerId?: string;
}): number => {
    const { entity, add } = createBaseEntity(config.world);
    const gameConfig = config.world.getResource<AsteroidConfig>("GameConfig");
    const bulletTtl = gameConfig?.BULLET_TTL ?? 2.0;

    add({
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

    add({
        type: "Velocity",
        vx: config.vx,
        vy: config.vy,
        angularVelocity: 0
    } as VelocityComponent);

    add({
        type: "Render",
        visible: true,
        opacity: 1,
        order: 2,
        rotation: 0,
        angularVelocity: 0,
        hitFlashFrames: 0
    } as RenderComponent);

    add({
        type: "Bullet",
        ownerId: config.ownerId
    } as AsteroidsComponentRegistry["Bullet"]);

    add({
        type: "TTL",
        remaining: bulletTtl,
        timeLeft: bulletTtl
    } as TTLComponent);

    add({
        type: "Collider",
        shape: { type: ShapeType.Circle, radius: 2 },
        layer: CollisionLayers.PROJECTILE,
        mask: CollisionLayers.ENEMY,
        enabled: true,
        isTrigger: false
    } as ColliderComponent);

    add({
        type: "CollisionEvents",
        collisions: [],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: []
    } as CollisionEventsComponent);

    return entity;
};

/** @public */
export const fragmentAsteroid = (world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, parentAsteroid: number): void => {
    const asteroid = world.getComponent(parentAsteroid, "Asteroid");
    const transform = world.getComponent(parentAsteroid, "Transform");
    const velocity = world.getComponent(parentAsteroid, "Velocity");
    if (!asteroid || !transform) return;

    let nextSize: string | null = null;
    if (asteroid.size === "large") nextSize = "medium";
    else if (asteroid.size === "medium") nextSize = "small";

    if (nextSize) {
        // Create 2 children
        // Use gameplayRandom for determinism
        const rand = world.gameplayRandom;
        const angle1 = rand.next() * Math.PI * 2;
        const angle2 = angle1 + Math.PI; // perpendicular / opposite directions

        const speed = 80; // speed of fragmentation impulse

        for (const angle of [angle1, angle2]) {
            const vx = (velocity ? velocity.vx : 0) + Math.cos(angle) * speed;
            const vy = (velocity ? velocity.vy : 0) + Math.sin(angle) * speed;

            const child = createAsteroid({
                world,
                x: transform.x,
                y: transform.y,
                size: nextSize
            });

            world.mutateComponent(child, "Velocity", (v) => {
                v.vx = vx;
                v.vy = vy;
            });
        }
    }
};

/** @public */
export const spawnAsteroidWave = (world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, level: number): void => {
    const config = world.getResource<AsteroidConfig>("GameConfig") || {
        SCREEN_WIDTH: 800,
        SCREEN_HEIGHT: 600,
        INITIAL_ASTEROID_COUNT: 5
    };
    const count = (config.INITIAL_ASTEROID_COUNT ?? 5) + (level - 1);
    const screen = world.getResource<{ width: number, height: number }>("ScreenConfig") || {
        width: config.SCREEN_WIDTH ?? 800,
        height: config.SCREEN_HEIGHT ?? 600
    };

    const rand = world.gameplayRandom;

    for (let i = 0; i < count; i++) {
        // Spawn asteroids away from the center (to avoid spawning on top of the player at the beginning of a wave)
        let x = rand.next() * screen.width;
        let y = rand.next() * screen.height;

        // Ensure it's at least 150px away from the center (where the ship starts)
        const centerX = screen.width / 2;
        const centerY = screen.height / 2;
        while (Math.hypot(x - centerX, y - centerY) < 150) {
            x = rand.next() * screen.width;
            y = rand.next() * screen.height;
        }

        createAsteroid({
            world,
            x,
            y,
            size: "large"
        });
    }
};
