import { World } from "../../core/World";
import { DamageNumberSystem } from "../DamageNumberSystem";
import { RandomService } from "../../utils/RandomService";

describe("DamageNumberSystem", () => {
    let world: World;

    beforeEach(() => {
        world = new World();
        RandomService.resetInstances();
    });

    it("should use render RNG and not advance gameplay RNG", () => {
        const gameplayRandom = RandomService.getGameplayRandom();
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

    it("should advance render RNG", () => {
        const renderRandom = RandomService.getRenderRandom();
        renderRandom.setSeed(12345);

        const initialValue = renderRandom.next();

        renderRandom.setSeed(12345);

        DamageNumberSystem.createDamageNumber(world, 100, 100, 10);

        const valueAfter = renderRandom.next();
        // Since createDamageNumber calls next() twice for velocity x and y
        // we expect it to have advanced.
        expect(valueAfter).not.toBe(initialValue);
    });
});
