"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAsteroid = exports.createShip = void 0;
const createShip = (config) => {
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
    });
    config.world.addComponent(entity, {
        type: "Velocity",
        vx: 0,
        vy: 0,
        angularVelocity: 0
    });
    config.world.addComponent(entity, {
        type: "Render",
        visible: true,
        opacity: 1,
        order: 1,
        rotation: 0,
        angularVelocity: 0,
        hitFlashFrames: 0
    });
    config.world.addComponent(entity, {
        type: "Health",
        current: 3,
        max: 3
    });
    return entity;
};
exports.createShip = createShip;
const createAsteroid = (config) => {
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
    });
    config.world.addComponent(entity, {
        type: "Velocity",
        vx: (config.world.gameplayRandom.next() - 0.5) * 100,
        vy: (config.world.gameplayRandom.next() - 0.5) * 100,
        angularVelocity: (config.world.gameplayRandom.next() - 0.5) * 2
    });
    config.world.addComponent(entity, {
        type: "Asteroid",
        size: config.size
    });
    config.world.addComponent(entity, {
        type: "Render",
        visible: true,
        opacity: 1,
        order: 0,
        rotation: 0,
        angularVelocity: 0,
        hitFlashFrames: 0
    });
    return entity;
};
exports.createAsteroid = createAsteroid;
