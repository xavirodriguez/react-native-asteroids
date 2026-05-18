import { World } from "../../../engine/core/World";
import { createShieldSegment, spawnShields } from "../EntityFactory";
import { GAME_CONFIG } from "../types/SpaceInvadersTypes";

describe("Space Invaders EntityFactory", () => {
    let world: World;

    beforeEach(() => {
        world = new World();
    });

    test("createShieldSegment should use SHIELD_SEGMENT_SIZE from config", () => {
        const x = 100, y = 100;
        const entity = createShieldSegment(world, x, y, 0, 0, false);

        const render = world.getComponent(entity, "Render") as any;
        const collider = world.getComponent(entity, "Collider2D") as any;

        expect(render.size).toBe(GAME_CONFIG.SHIELD_SEGMENT_SIZE);
        expect(collider.shape.halfWidth).toBe(GAME_CONFIG.SHIELD_SEGMENT_SIZE / 2);
    });

    test("spawnShields should use SHIELD_START_X and SHIELD_SEGMENT_SIZE from config", () => {
        spawnShields(world, false);

        const shields = world.query("Shield", "Transform");
        expect(shields.length).toBeGreaterThan(0);

        const transforms = shields.map(e => world.getComponent(e, "Transform") as any);
        const minX = Math.min(...transforms.map(t => t.x));
        const minY = Math.min(...transforms.map(t => t.y));

        expect(minX).toBe(GAME_CONFIG.SHIELD_START_X);
        expect(minY).toBe(GAME_CONFIG.SHIELD_START_Y);
    });
});
