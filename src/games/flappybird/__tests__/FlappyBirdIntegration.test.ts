import { FlappyBirdGame } from "../FlappyBirdGame";
import { FlappyBirdState } from "../types/FlappyBirdTypes";
import { TransformComponent, RenderComponent } from "../../../engine/types/EngineTypes";

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

describe("Flappy Bird Integration", () => {
    let game: FlappyBirdGame;

    beforeEach(async () => {
        game = new FlappyBirdGame({ seed: 12345 });
        await game.init();
        // Flush deferred entities
        game.getWorld().update(0);
    });

    afterEach(() => {
        game.destroy();
    });

    test("should initialize entities correctly", () => {
        const world = game.getWorld();
        const bird = world.query("Bird", "Transform")[0];
        const gameState = world.getSingleton<FlappyBirdState>("FlappyState");
        const ground = world.query("Transform").find(e => {
            const render = world.getComponent<RenderComponent>(e, "Render");
            return render?.shape === "ground";
        });

        expect(bird).toBeDefined();
        expect(gameState).toBeDefined();
        expect(ground).toBeDefined();
        expect(gameState?.score).toBe(0);
        expect(gameState?.isGameOver).toBe(false);
    });

    test("should apply gravity to bird during update", () => {
        const world = game.getWorld();
        const bird = world.query("Bird", "Transform")[0];
        const initialPos = { ...world.getComponent<TransformComponent>(bird, "Transform") };

        // Run a few frames
        for (let i = 0; i < 10; i++) {
            world.update(16.66);
        }

        const finalPos = world.getComponent<TransformComponent>(bird, "Transform");
        // Bird should fall (y increases in screen coordinates)
        expect(finalPos?.y).toBeGreaterThan(initialPos.y ?? 0);
    });

    test("should reach game over when bird hits the ground", () => {
        const world = game.getWorld();
        const bird = world.query("Bird", "Transform")[0];

        expect(bird).toBeDefined();

        // Move bird to the ground manually (Y > 580)
        world.mutateComponent<TransformComponent>(bird, "Transform", t => {
            t.y = 590;
        });

        // Run updates to detect and resolve collision
        // We might need a few frames because of how systems are ordered
        for (let i = 0; i < 5; i++) {
            world.update(16.66);
        }

        const gameState = world.getSingleton<FlappyBirdState>("FlappyState");
        expect(gameState?.isGameOver).toBe(true);
    });
});
