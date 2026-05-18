import { AsteroidsGame } from "../AsteroidsGame";

// Mock services that use AsyncStorage or native modules
jest.mock("../../../services/MutatorService", () => ({
    MutatorService: {
        getActiveMutatorsForGame: jest.fn().mockReturnValue([]),
        isMutatorModeEnabled: jest.fn().mockResolvedValue(false)
    }
}));
jest.mock("../../../services/PlayerProfileService", () => ({
    PlayerProfileService: {
        getProfile: jest.fn().mockResolvedValue({ activePalette: "default" })
    }
}));
jest.mock("../../../engine/core/AudioSystem");

describe("Asteroids Headless Mode", () => {
    test("should initialize without visual systems", async () => {
        const game = new AsteroidsGame({ headless: true, seed: 12345 });
        await game.init();

        const world = game.getWorld();
        const systems = world.systemsList;

        const hasRenderUpdate = systems.some(s => s.constructor.name === "RenderUpdateSystem");
        const hasAsteroidRender = systems.some(s => s.constructor.name === "AsteroidRenderSystem");
        const hasJuice = systems.some(s => s.constructor.name === "JuiceSystem");
        const hasScreenShake = systems.some(s => s.constructor.name === "ScreenShakeSystem");

        expect(hasRenderUpdate).toBe(false);
        expect(hasAsteroidRender).toBe(false);
        expect(hasJuice).toBe(false);
        expect(hasScreenShake).toBe(false);

        // Essential gameplay systems should be there
        const hasMovement = systems.some(s => s.constructor.name === "MovementSystem");
        const hasCollision = systems.some(s => s.constructor.name === "CollisionSystem2D");

        expect(hasMovement).toBe(true);
        expect(hasCollision).toBe(true);

        game.destroy();
    });

    test("should advance simulation correctly in headless mode", async () => {
        const game = new AsteroidsGame({ headless: true, seed: 12345 });
        await game.init();

        const world = game.getWorld();
        const ship = world.query("Ship", "Transform")[0];
        const initialPos = { ...world.getComponent<any>(ship, "Transform") };

        // Apply thrust via input
        game.applyInputToEntity(ship, {
            tick: 1,
            timestamp: Date.now(),
            actions: ["thrust"],
            axes: {},
            protocolVersion: 1
        });

        // Step simulation
        for (let i = 0; i < 10; i++) {
            game.runSimulationStep(16.66, false);
        }

        const finalPos = world.getComponent<any>(ship, "Transform");
        expect(finalPos.x !== initialPos.x || finalPos.y !== initialPos.y).toBe(true);

        game.destroy();
    });
});
