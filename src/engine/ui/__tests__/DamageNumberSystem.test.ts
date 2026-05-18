import { World } from "../../core/World";
import { DamageNumberSystem } from "../DamageNumberSystem";
import { RandomService } from "../../utils/RandomService";

describe("DamageNumberSystem", () => {
    let world: World;

    beforeEach(() => {
        world = new World();
        RandomService.resetInstances();
    });

    test("createDamageNumber should not advance gameplay RNG stream", () => {
        const gameplayRandom = RandomService.getInstance("gameplay");
        gameplayRandom.setSeed(12345);

        // Capture initial sequence
        const initialValue = gameplayRandom.next();

        // Reset seed to get the same sequence
        gameplayRandom.setSeed(12345);

        // Create damage number (should use render RNG)
        DamageNumberSystem.createDamageNumber(world, 100, 100, 50);

        // Check if gameplay stream is still at the beginning
        const valueAfterDamageNumber = gameplayRandom.next();

        expect(valueAfterDamageNumber).toBe(initialValue);
    });

    test("createDamageNumber should advance render RNG stream", () => {
        const renderRandom = RandomService.getInstance("render");
        renderRandom.setSeed(54321);

        const initialValue = renderRandom.next();

        renderRandom.setSeed(54321);

        DamageNumberSystem.createDamageNumber(world, 100, 100, 50);

        const valueAfterDamageNumber = renderRandom.next();

        // It should have advanced (actually twice, once for x and once for y velocity)
        expect(valueAfterDamageNumber).not.toBe(initialValue);
    });
});
