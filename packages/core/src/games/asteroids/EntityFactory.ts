import { World } from "../../ecs/World";
import { TransformComponent, VelocityComponent, RenderComponent, HealthComponent, FrictionComponent } from "../../ecs/CoreComponents";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "./types/AsteroidRegistry";
import { InputComponent } from "./types/AsteroidTypes";
import { ShapeType } from "../../physics/shapes/Shapes";

/**
 * Universal helper to create entities and components.
 * Automatically detects whether we are inside a World update phase (world.isUpdating === true)
 * and uses deferred commands accordingly to avoid structural mutation crashes.
 */
function addEntity(world: World<any, any, any>): {
    entity: number;
    addComponent: (comp: any) => void;
} {
    if (world.isUpdating) {
        const entity = world.reserveEntityId();
        world.getCommandBuffer().createEntity(entity);
        return {
            entity,
            addComponent: (comp: any) => {
                world.getCommandBuffer().addComponent(entity, comp);
            }
        };
    } else {
        const entity = world.createEntity();
        return {
            entity,
            addComponent: (comp: any) => {
                world.addComponent(entity, comp);
            }
        };
    }
}

/** @public */
export const createShip = (config: { world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, x: number, y: number }): number => {
    const { entity, addComponent } = addEntity(config.world);

    const screenConfig = config.world.getResource<any>("ScreenConfig") || { width: 800, height: 600 };
    const screenW = screenConfig.width ?? 800;
    const screenH = screenConfig.height ?? 600;
    const gameConfig = config.world.getResource<any>("GameConfig") || { SHIP_FRICTION: 0.5 };

    addComponent({
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

    addComponent({
        type: "Input",
        rotateLeft: false,
        rotateRight: false,
        thrust: false,
        shoot: false,
        hyperspace: false,
        rotationAmount: 0
    } as InputComponent);

    addComponent({
        type: "Velocity",
        vx: 0,
        vy: 0,
        angularVelocity: 0
    } as VelocityComponent);

    addComponent({
        type: "Friction",
        value: gameConfig.SHIP_FRICTION ?? 0.5
    } as FrictionComponent);

    addComponent({
        type: "Render",
        visible: true,
        opacity: 1,
        order: 1,
        rotation: 0,
        angularVelocity: 0,
        hitFlashFrames: 0
    } as RenderComponent);

    addComponent({
        type: "Health",
        current: 3,
        max: 3
    } as HealthComponent);

    addComponent({
        type: "Boundary",
        width: screenW,
        height: screenH,
        mode: "wrap"
    } as any);

    addComponent({
        type: "Collider",
        shape: { type: ShapeType.Circle, radius: 10 },
        layer: 1, // PLAYER_LAYER = 1
        mask: 2,  // ASTEROID_LAYER = 2
        enabled: true,
        isTrigger: false
    } as any);

    addComponent({
        type: "CollisionEvents",
        collisions: [],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: []
    } as any);

    return entity;
};

/** @public */
export const createAsteroid = (config: { world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, x: number, y: number, size: string }): number => {
    const { entity, addComponent } = addEntity(config.world);

    const screenConfig = config.world.getResource<any>("ScreenConfig") || { width: 800, height: 600 };
    const screenW = screenConfig.width ?? 800;
    const screenH = screenConfig.height ?? 600;

    // Safely generate random velocities using world.gameplayRandom, unlocking it temporarily if needed
    const rng = config.world.gameplayRandom;
    const originallyLocked = rng.isLocked();
    if (originallyLocked) rng.unlock();

    const vx = (rng.next() - 0.5) * 100;
    const vy = (rng.next() - 0.5) * 100;
    const angularVelocity = (rng.next() - 0.5) * 2;

    if (originallyLocked) rng.lock();

    addComponent({
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

    addComponent({
        type: "Velocity",
        vx,
        vy,
        angularVelocity
    } as VelocityComponent);

    addComponent({
        type: "Asteroid",
        size: config.size
    } as AsteroidsComponentRegistry["Asteroid"]);

    addComponent({
        type: "Render",
        visible: true,
        opacity: 1,
        order: 0,
        rotation: 0,
        angularVelocity: 0,
        hitFlashFrames: 0
    } as RenderComponent);

    addComponent({
        type: "Boundary",
        width: screenW,
        height: screenH,
        mode: "wrap"
    } as any);

    let radius = 15;
    if (config.size === "large") radius = 30;
    else if (config.size === "medium") radius = 15;
    else if (config.size === "small") radius = 8;

    addComponent({
        type: "Collider",
        shape: { type: ShapeType.Circle, radius },
        layer: 2, // ASTEROID_LAYER = 2
        mask: 1 | 4, // PLAYER_LAYER | BULLET_LAYER = 1 | 4
        enabled: true,
        isTrigger: false
    } as any);

    addComponent({
        type: "CollisionEvents",
        collisions: [],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: []
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
    lifetime?: number;
}): number => {
    const { entity, addComponent } = addEntity(config.world);

    const screenConfig = config.world.getResource<any>("ScreenConfig") || { width: 800, height: 600 };
    const screenW = screenConfig.width ?? 800;
    const screenH = screenConfig.height ?? 600;

    addComponent({
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
        dirty: true,
    } as TransformComponent);

    addComponent({
        type: "Velocity",
        vx: config.vx,
        vy: config.vy,
        angularVelocity: 0,
    } as VelocityComponent);

    addComponent({
        type: "Render",
        visible: true,
        opacity: 1,
        order: 2,
        rotation: 0,
        angularVelocity: 0,
        hitFlashFrames: 0,
        shape: "circle",
        size: 2,
    } as RenderComponent);

    addComponent({
        type: "Bullet",
        ownerId: config.ownerId,
    } as AsteroidsComponentRegistry["Bullet"]);

    addComponent({
        type: "Boundary",
        width: screenW,
        height: screenH,
        mode: "wrap"
    } as any);

    addComponent({
        type: "Collider",
        shape: { type: ShapeType.Circle, radius: 2 },
        layer: 4, // BULLET_LAYER = 4
        mask: 2,  // ASTEROID_LAYER = 2
        enabled: true,
        isTrigger: false
    } as any);

    addComponent({
        type: "CollisionEvents",
        collisions: [],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: []
    } as any);

    addComponent({
        type: "TTL",
        timeLeft: config.lifetime ?? 2.0,
        remaining: config.lifetime ?? 2.0,
    } as any);

    return entity;
};
