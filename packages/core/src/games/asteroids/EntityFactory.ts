import { World } from "../../ecs/World";
import { TransformComponent, VelocityComponent, RenderComponent, HealthComponent } from "../../ecs/CoreComponents";
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
