import Matter from "matter-js";
import { IPhysicsAdapter } from "../../core/types/SystemTypes";
export declare class MatterPhysicsAdapter implements IPhysicsAdapter {
    private engine;
    private runner;
    private bodies;
    constructor(config?: Matter.IEngineDefinition);
    update(dt: number): void;
    createBody(entityId: number, config: any): Matter.Body;
    removeBody(bodyId: number): void;
    applyForce(bodyId: number, position: {
        x: number;
        y: number;
    }, force: {
        x: number;
        y: number;
    }): void;
    applyImpulse(bodyId: number, impulse: {
        x: number;
        y: number;
    }): void;
    setVelocity(bodyId: number, velocity: {
        x: number;
        y: number;
    }): void;
    setPosition(bodyId: number, position: {
        x: number;
        y: number;
    }): void;
    setRotation(bodyId: number, angle: number): void;
    getBodyTransform(bodyId: number): {
        x: number;
        y: number;
        rotation: number;
    };
    getMatterWorld(): Matter.World;
    getMatterEngine(): Matter.Engine;
}
