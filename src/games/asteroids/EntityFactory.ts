import { World, System } from "@tiny-aster/core";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "./types/AsteroidRegistry";

export const createShip = (config: { world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, x: number, y: number }): number => {
    return config.world.createEntity();
};

export const createAsteroid = (config: { world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, x: number, y: number, size: string }): number => {
    return config.world.createEntity();
};
