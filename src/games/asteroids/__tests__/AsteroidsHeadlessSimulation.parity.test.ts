import { World } from "../../../engine/core/World";
import { AsteroidsHeadlessSimulation } from "../headless/AsteroidsHeadlessSimulation";
import { DeterministicSimulation } from "../../../simulation/DeterministicSimulation";
import { createShip, createAsteroid, createGameState } from "../EntityFactory";
import { RandomService } from "../../../engine/utils/RandomService";

describe("AsteroidsHeadlessSimulation Parity", () => {
    const FIXED_DT = 16.66;
    const SEED = 12345;

    it("should compare DeterministicSimulation vs Headless ECS", () => {
        // Run Deterministic
        RandomService.resetInstances();
        const worldDet = new World();
        RandomService.getInstance("gameplay", SEED).setSeed(SEED);
        createGameState({ world: worldDet, headless: true });
        createShip({ world: worldDet, x: 400, y: 300 });
        worldDet.removeComponent(2, "ManualMovement");
        createAsteroid({ world: worldDet, x: 100, y: 100, size: "large" });

        for (let i = 0; i < 60; i++) {
            DeterministicSimulation.update(worldDet, FIXED_DT, { isResimulating: false });
            worldDet.flush();
        }
        // const snapshotDet = getLogicalSnapshot(worldDet);

        // Run Headless
        RandomService.resetInstances();
        const simHeadless = new AsteroidsHeadlessSimulation({ seed: SEED });
        const worldHeadless = simHeadless.getWorld();
        createGameState({ world: worldHeadless, headless: true });
        createShip({ world: worldHeadless, x: 400, y: 300 });
        worldHeadless.removeComponent(2, "ManualMovement");
        createAsteroid({ world: worldHeadless, x: 100, y: 100, size: "large" });

        for (let i = 0; i < 60; i++) {
            simHeadless.step(FIXED_DT);
        }
        // const snapshotHeadless = getLogicalSnapshot(worldHeadless);

        // Movement should be close
        const shipDetPos = worldDet.getComponent<any>(2, "Transform");
        const shipHeadlessPos = worldHeadless.getComponent<any>(2, "Transform");

        expect(shipHeadlessPos.y).toBeCloseTo(shipDetPos.y, 2);
    });
});
