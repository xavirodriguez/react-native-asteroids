import { AsteroidsGame } from "../AsteroidsGame";
import { RandomService } from "../../../engine/utils/RandomService";
import { getLogicalSnapshot } from "./utils/TestHelpers";

describe("Asteroids ECS Characterization", () => {
    const FIXED_DT = 16.66;
    const SEED = 12345;

    async function setupGame(seed: number) {
        const game = new AsteroidsGame({ headless: true, seed });
        await game.init();
        const world = game.getWorld();
        const ship = world.query("Ship")[0];
        if (ship !== undefined) world.removeComponent(ship, "ManualMovement");
        return { game, world, ship };
    }

    it("should be self-deterministic using AsteroidsGame", async () => {
        RandomService.resetInstances();
        const { game: game1, world: world1 } = await setupGame(SEED);
        for (let i = 0; i < 10; i++) {
            game1.runSimulationStep(FIXED_DT, false);
        }
        const snapshot1 = getLogicalSnapshot(world1);

        RandomService.resetInstances();
        const { game: game2, world: world2 } = await setupGame(SEED);
        for (let i = 0; i < 10; i++) {
            game2.runSimulationStep(FIXED_DT, false);
        }
        const snapshot2 = getLogicalSnapshot(world2);

        expect(snapshot1).toEqual(snapshot2);
    });
});
