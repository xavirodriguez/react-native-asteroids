import { AsteroidsGame } from "../AsteroidsGame";
import { RandomService } from "../../../engine/utils/RandomService";
import { getLogicalSnapshot } from "./utils/TestHelpers";
import { InputComponent } from "../types/AsteroidTypes";

describe("Asteroids ECS Determinism", () => {
    const FIXED_DT = 16.66;
    const SEED = 12345;

    it("should produce identical results from the same seed and inputs", async () => {
        // Run first simulation
        RandomService.resetInstances();
        const game1 = new AsteroidsGame({ headless: true, seed: SEED });
        await game1.init();
        const world1 = game1.getWorld();

        const ship1 = world1.query("Ship")[0];
        if (ship1 !== undefined) world1.removeComponent(ship1, "ManualMovement");

        for (let i = 0; i < 60; i++) {
            const thrust = i < 30;
            world1.mutateComponent<InputComponent>(ship1, "Input", input => {
                input.thrust = thrust;
            });
            game1.runSimulationStep(FIXED_DT, false);
        }
        const snapshot1 = getLogicalSnapshot(world1);

        // Run second simulation
        RandomService.resetInstances();
        const game2 = new AsteroidsGame({ headless: true, seed: SEED });
        await game2.init();
        const world2 = game2.getWorld();

        const ship2 = world2.query("Ship")[0];
        if (ship2 !== undefined) world2.removeComponent(ship2, "ManualMovement");

        for (let i = 0; i < 60; i++) {
            const thrust = i < 30;
            world2.mutateComponent<InputComponent>(ship2, "Input", input => {
                input.thrust = thrust;
            });
            game2.runSimulationStep(FIXED_DT, false);
        }
        const snapshot2 = getLogicalSnapshot(world2);

        expect(snapshot1).toEqual(snapshot2);
    });
});
