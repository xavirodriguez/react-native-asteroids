import { AsteroidsHeadlessSimulation } from "../headless/AsteroidsHeadlessSimulation";
import { createShip, createGameState } from "../EntityFactory";
import { RandomService } from "../../../engine/utils/RandomService";
import { getLogicalSnapshot } from "./utils/TestHelpers";
import { InputComponent } from "../types/AsteroidTypes";

describe("AsteroidsHeadlessSimulation Determinism", () => {
    const FIXED_DT = 16.66;
    const SEED = 12345;

    it("should produce identical results from the same seed and inputs", () => {
        // Run first simulation
        RandomService.resetInstances();
        const sim1 = new AsteroidsHeadlessSimulation({ seed: SEED });
        const world1 = sim1.getWorld();
        createGameState({ world: world1, headless: true });
        createShip({ world: world1, x: 400, y: 300 });
        world1.removeComponent(2, "ManualMovement");

        for (let i = 0; i < 60; i++) {
            const thrust = i < 30;
            world1.mutateComponent<InputComponent>(2, "Input", input => {
                input.thrust = thrust;
            });
            sim1.step(FIXED_DT);
        }
        const snapshot1 = getLogicalSnapshot(world1);

        // Run second simulation
        RandomService.resetInstances();
        const sim2 = new AsteroidsHeadlessSimulation({ seed: SEED });
        const world2 = sim2.getWorld();
        createGameState({ world: world2, headless: true });
        createShip({ world: world2, x: 400, y: 300 });
        world2.removeComponent(2, "ManualMovement");

        for (let i = 0; i < 60; i++) {
            const thrust = i < 30;
            world2.mutateComponent<InputComponent>(2, "Input", input => {
                input.thrust = thrust;
            });
            sim2.step(FIXED_DT);
        }
        const snapshot2 = getLogicalSnapshot(world2);

        expect(snapshot1).toEqual(snapshot2);
    });
});
