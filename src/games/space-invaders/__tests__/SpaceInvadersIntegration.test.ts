import { SpaceInvadersGame } from "../SpaceInvadersGame";
import { GameStateComponent } from "../types/SpaceInvadersTypes";
import { TransformComponent } from "../../../engine/types/EngineTypes";

// Mock AudioSystem to avoid loading errors in Node
jest.mock("../../../engine/core/AudioSystem");
// Mock MutatorService to avoid AsyncStorage errors
jest.mock("../../../services/MutatorService", () => ({
    MutatorService: {
        getActiveMutatorsForGame: jest.fn().mockReturnValue([]),
        isMutatorModeEnabled: jest.fn().mockResolvedValue(false)
    }
}));
// Mock PlayerProfileService to avoid AsyncStorage errors
jest.mock("../../../services/PlayerProfileService", () => ({
    PlayerProfileService: {
        getProfile: jest.fn().mockResolvedValue({ activePalette: "default" })
    }
}));

describe("Space Invaders Integration", () => {
    let game: SpaceInvadersGame;

    beforeEach(async () => {
        game = new SpaceInvadersGame({ seed: 12345 });
        await game.init();
        // For Space Invaders, we need to enter the scene to spawn entities
        const scene = (game as unknown as { sceneManager: { getCurrentScene: () => unknown } }).sceneManager.getCurrentScene();
        if (scene) {
            // Scene creates its own world, but game.getWorld() should return it once active
            await (game as unknown as { sceneManager: { processQueue: () => Promise<void> } }).sceneManager.processQueue(); // Ensure transitions are processed
        }
    });

    afterEach(() => {
        game.destroy();
    });

    test("should initialize entities correctly", async () => {
        const world = game.getWorld();

        // Wait for potential async scene logic
        for(let i=0; i<5; i++) world.update(0);

        const player = world.query("Player", "Transform")[0];
        const invaders = world.query("Invader");
        const shields = world.query("Shield");
        const gameState = world.getSingleton<GameStateComponent>("GameState");

        expect(player).toBeDefined();
        expect(invaders.length).toBeGreaterThan(0);
        expect(shields.length).toBeGreaterThan(0);
        expect(gameState).toBeDefined();
        expect(gameState?.score).toBe(0);
        expect(gameState?.isGameOver).toBe(false);
    });

    test("should move invaders during update", async () => {
        const world = game.getWorld();

        // Wait for entities to spawn
        for(let i=0; i<5; i++) world.update(0);

        const firstInvader = world.query("Invader", "Transform")[0];
        expect(firstInvader).toBeDefined();

        const initialPos = { ...world.getComponent<TransformComponent>(firstInvader, "Transform") };

        // Run several frames to ensure movement
        for (let i = 0; i < 120; i++) {
            world.update(16.66);
        }

        const finalPos = world.getComponent<TransformComponent>(firstInvader, "Transform");
        expect(finalPos?.x).not.toBe(initialPos.x);
    });
});
