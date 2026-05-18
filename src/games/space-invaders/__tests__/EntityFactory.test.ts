import { World } from "../../../engine/core/World";
import { spawnShields } from "../EntityFactory";
import { GAME_CONFIG } from "../types/SpaceInvadersTypes";
import { TransformComponent } from "../../../engine/core/CoreComponents";

describe("Space Invaders EntityFactory", () => {
    it("should use SHIELD_START_X and SHIELD_SEGMENT_SIZE when spawning shields", () => {
        const world = new World();
        spawnShields(world, false);

        const shields = world.query("Shield");
        expect(shields.length).toBeGreaterThan(0);

        const firstShield = shields[0];
        const transform = world.getComponent<TransformComponent>(firstShield, "Transform")!;

        // The first shield segment (col 0, row 0, bunker 0) should be at SHIELD_START_X
        // Since query order might not be guaranteed, let's find the one with min X
        let minX = Infinity;
        for (const s of shields) {
            const t = world.getComponent<TransformComponent>(s, "Transform")!;
            if (t.x < minX) minX = t.x;
        }

        expect(minX).toBe(GAME_CONFIG.SHIELD_START_X);

        // Verify spacing between segments (col 0 and col 1 of the same bunker)
        const bunker0Segments = shields.filter(s => {
            const t = world.getComponent<TransformComponent>(s, "Transform")!;
            return t.x < GAME_CONFIG.SHIELD_START_X + GAME_CONFIG.SHIELD_WIDTH;
        });

        const xPositions = Array.from(new Set(bunker0Segments.map(s => world.getComponent<TransformComponent>(s, "Transform")!.x))).sort((a, b) => a - b);
        if (xPositions.length > 1) {
            expect(xPositions[1] - xPositions[0]).toBe(GAME_CONFIG.SHIELD_SEGMENT_SIZE);
        }
    });
});
