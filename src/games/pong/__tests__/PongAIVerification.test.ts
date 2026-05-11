import { PongGame } from "../PongGame";
import { PongInputSystem } from "../systems/PongInputSystem";

// Mock MutatorService to avoid AsyncStorage issues
jest.mock("../../../services/MutatorService", () => ({
  MutatorService: {
    getActiveMutatorsForGame: jest.fn().mockReturnValue([]),
    isMutatorModeEnabled: jest.fn().mockResolvedValue(false),
  },
}));

// Mock PlayerProfileService to avoid AsyncStorage issues
jest.mock("../../../services/PlayerProfileService", () => ({
  PlayerProfileService: {
    getProfile: jest.fn().mockResolvedValue({ activePalette: "default" }),
  },
}));

describe("Pong AI Verification", () => {
  it("should initialize with AI controller when mode is ai", async () => {
    const game = new PongGame({ gameOptions: { mode: "ai" } });
    await game.init();

    const world = game.getWorld();
    const systems = (world as any).systemsList;
    const inputSystem = systems.find((s: any) => s instanceof PongInputSystem);

    expect(inputSystem).toBeDefined();
    expect((inputSystem as any).aiController).toBeDefined();
  });

  it("should NOT initialize with AI controller when mode is local", async () => {
    const game = new PongGame({ gameOptions: { mode: "local" } });
    await game.init();

    const world = game.getWorld();
    const systems = (world as any).systemsList;
    const inputSystem = systems.find((s: any) => s instanceof PongInputSystem);

    expect(inputSystem).toBeDefined();
    expect((inputSystem as any).aiController).toBeUndefined();
  });
});
