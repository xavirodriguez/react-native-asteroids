import { AsteroidsGame } from "../../games/asteroids/AsteroidsGame";
import { ReplayManager } from "../ReplayManager";
import { ReplayData } from "../NetTypes";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(null),
}));

describe("Replay Isolation", () => {
  it("should not modify prediction buffer during replay", async () => {
    const game = new AsteroidsGame({ isMultiplayer: true });
    await game.init();

    // We need to access predictionBuffer which is private, but for testing we can cast to any
    const predictionBuffer = (game as any).predictionBuffer;
    const saveSpy = jest.spyOn(predictionBuffer, "save");

    const replayManager = new ReplayManager();
    const mockReplay: ReplayData = {
      version: 1,
      seed: 12345,
      frames: [
        {
          tick: 1,
          timestamp: Date.now(),
          inputs: {
            "player1": [{ tick: 1, actions: ["thrust"], timestamp: Date.now() }]
          }
        }
      ]
    };

    // Ensure a ship with player1 sessionId exists
    game.getWorld().query("Ship").forEach(e => {
        game.getWorld().mutateComponent(e, "Ship", (s: any) => {
            s.sessionId = "player1";
        });
    });

    replayManager.loadReplay(mockReplay);
    replayManager.update(game, 16.66);

    // predictLocalPlayer should NOT have been called, and save should NOT have been called
    expect(saveSpy).not.toHaveBeenCalled();
  });
});
