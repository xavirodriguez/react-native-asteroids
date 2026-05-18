import { World } from "../../../engine/core/World";
import { DeterministicSimulation } from "../../../simulation/DeterministicSimulation";
import { createShip, createGameState } from "../EntityFactory";
import { RandomService } from "../../../engine/utils/RandomService";
import { getLogicalSnapshot } from "./utils/TestHelpers";

describe("DeterministicSimulation Characterization", () => {
    const FIXED_DT = 16.66;
    const SEED = 12345;

    function setupWorld(seed: number) {
        const world = new World();
        RandomService.getInstance("gameplay", seed).setSeed(seed);
        createGameState({ world, headless: true });
        const ship = createShip({ world, x: 400, y: 300 });
        world.removeComponent(ship, "ManualMovement");
        return { world, ship };
    }

    it("should be self-deterministic", () => {
        RandomService.resetInstances();
        const { world: world1 } = setupWorld(SEED);
        for (let i = 0; i < 10; i++) {
            DeterministicSimulation.update(world1, FIXED_DT, { isResimulating: false });
            world1.flush();
        }
        const snapshot1 = getLogicalSnapshot(world1);

        RandomService.resetInstances();
        const { world: world2 } = setupWorld(SEED);
        for (let i = 0; i < 10; i++) {
            DeterministicSimulation.update(world2, FIXED_DT, { isResimulating: false });
            world2.flush();
        }
        const snapshot2 = getLogicalSnapshot(world2);

        expect(snapshot1).toEqual(snapshot2);
    });
});
