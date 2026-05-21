import { PongGame } from "../PongGame";
import { PONG_CONFIG, PongState } from "../types";
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

describe("Pong Integration", () => {
    let game: PongGame;

    beforeEach(async () => {
        game = new PongGame({ seed: 12345 });
        await game.init();
    });

    afterEach(() => {
        game.destroy();
    });

    test("should initialize entities correctly", () => {
        const world = game.getWorld();
        const ball = world.query("Ball", "Transform")[0];
        const paddles = world.query("Paddle", "Transform");
        const gameState = world.getSingleton<PongState>("PongState");

        expect(ball).toBeDefined();
        expect(paddles.length).toBe(2);
        expect(gameState).toBeDefined();
        expect(gameState?.scoreP1).toBe(0);
        expect(gameState?.scoreP2).toBe(0);
        expect(gameState?.isGameOver).toBe(false);
    });

    test("should update score when ball goes out of bounds", () => {
        const world = game.getWorld();
        const ball = world.query("Ball", "Transform")[0];

        // Move ball out of bounds (left)
        world.mutateComponent<TransformComponent>(ball, "Transform", t => {
            t.x = -10;
        });

        // Run update
        world.update(16.66);

        const gameState = world.getSingleton<PongState>("PongState");
        expect(gameState?.scoreP2).toBe(1);

        // Ball should be reset to center
        const ballPos = world.getComponent<TransformComponent>(ball, "Transform");
        expect(ballPos?.x).toBe(PONG_CONFIG.WIDTH / 2);
    });

    test("should reach game over when winning score is reached", () => {
        const world = game.getWorld();
        const ball = world.query("Ball", "Transform")[0];

        // Give P1 win score - 1
        world.mutateSingleton<PongState>("PongState", s => {
            s.scoreP1 = PONG_CONFIG.WIN_SCORE - 1;
        });

        // Move ball out of bounds (right)
        world.mutateComponent<TransformComponent>(ball, "Transform", t => {
            t.x = PONG_CONFIG.WIDTH + 10;
        });

        // Run update
        world.update(16.66);

        const gameState = world.getSingleton<PongState>("PongState");
        expect(gameState?.scoreP1).toBe(PONG_CONFIG.WIN_SCORE);
        expect(gameState?.isGameOver).toBe(true);
        expect(gameState?.winner).toBe(1);
    });
});
