import { World } from "@tiny-aster/core";
import { DamageNumberSystem } from "../DamageNumberSystem";
import { RandomService } from "@tiny-aster/core";

describe("DamageNumberSystem", () => {
    let world: World;

    beforeEach(() => {
        world = new World();
        RandomService.resetInstances();
    });

    it("should use world.renderRandom and not advance world.gameplayRandom", () => {
        const gameplayRandom = world.gameplayRandom;
        gameplayRandom.setSeed(12345);

        // Initial value from gameplay RNG
        const initialValue = gameplayRandom.next();

        // Reset gameplay RNG to same state
        gameplayRandom.setSeed(12345);

        // Create a damage number
        DamageNumberSystem.createDamageNumber(world, 100, 100, 10);

        // Gameplay RNG should NOT have advanced
        const valueAfter = gameplayRandom.next();
        expect(valueAfter).toBe(initialValue);
    });

    it("should advance world.renderRandom", () => {
        const renderRandom = world.renderRandom;
        renderRandom.setSeed(12345);

        // Advance once to have an initial value
        renderRandom.next();
        const valueAtStart = renderRandom.next();

        // Reset to state before createDamageNumber
        renderRandom.setSeed(12345);

        DamageNumberSystem.createDamageNumber(world, 100, 100, 10);

        const valueAfter = renderRandom.next();
        // Since createDamageNumber calls next() twice for velocity x and y
        // we expect it to have advanced.
        expect(valueAfter).not.toBe(valueAtStart);
    });
});
