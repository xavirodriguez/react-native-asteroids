import { AsteroidsGame } from "../AsteroidsGame";
import { RandomService } from "../../../engine/utils/RandomService";
import { TransformComponent } from "../../../engine/types/EngineTypes";

describe("Asteroids ECS Parity", () => {
    const FIXED_DT = 16.66;
    const SEED = 12345;

    it("should produce identical results between two headless game instances", async () => {
        const { createAsteroid } = require("../EntityFactory");

        // Instance 1
        RandomService.resetInstances();
        const game1 = new AsteroidsGame({ headless: true, seed: SEED });
        await game1.init();
        const world1 = game1.getWorld();

        // Manual entity setup to match old parity test logic
        const ship1 = world1.query("Ship")[0];
        if (ship1 !== undefined) world1.removeComponent(ship1, "ManualMovement");
        createAsteroid({ world: world1, x: 100, y: 100, size: "large" });

        for (let i = 0; i < 60; i++) {
            game1.runSimulationStep(FIXED_DT, false);
        }

        // Instance 2
        RandomService.resetInstances();
        const game2 = new AsteroidsGame({ headless: true, seed: SEED });
        await game2.init();
        const world2 = game2.getWorld();

        const ship2 = world2.query("Ship")[0];
        if (ship2 !== undefined) world2.removeComponent(ship2, "ManualMovement");
        createAsteroid({ world: world2, x: 100, y: 100, size: "large" });

        for (let i = 0; i < 60; i++) {
            game2.runSimulationStep(FIXED_DT, false);
        }

        const ship1Pos = world1.getComponent<TransformComponent>(ship1, "Transform");
        const ship2Pos = world2.getComponent<TransformComponent>(ship2, "Transform");

        expect(ship1Pos?.x).toBeCloseTo(ship2Pos?.x ?? 0, 5);
        expect(ship1Pos?.y).toBeCloseTo(ship2Pos?.y ?? 0, 5);
    });
});
