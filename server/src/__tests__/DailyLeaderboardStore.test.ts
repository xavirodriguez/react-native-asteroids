import { DailyLeaderboardStore } from "../DailyLeaderboardStore";
import fs from "fs";
import path from "path";

describe("DailyLeaderboardStore", () => {
  let store: DailyLeaderboardStore;
  const dataDir = path.join(process.cwd(), "data");
  const dbPath = path.join(dataDir, "leaderboards.db");

  beforeEach(() => {
    // Cleanup existing DB if any
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    store = new DailyLeaderboardStore();
  });

  afterAll(() => {
    if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
    }
  });

  test("should check and update rate limit correctly", () => {
    const playerId = "test-player";
    const cooldown = 1000;

    // First submission should pass
    expect(store.checkAndUpdateRateLimit(playerId, cooldown)).toBe(true);

    // Immediate second submission should fail
    expect(store.checkAndUpdateRateLimit(playerId, cooldown)).toBe(false);

    // After cooldown it should pass again
    // We mock Date.now for precise control
    const now = Date.now();
    const spy = jest.spyOn(Date, 'now').mockReturnValue(now + cooldown + 1);

    expect(store.checkAndUpdateRateLimit(playerId, cooldown)).toBe(true);

    spy.mockRestore();
  });

  test("rate limit should be persistent after store restart", () => {
      const playerId = "persistent-player";
      const cooldown = 10000;

      expect(store.checkAndUpdateRateLimit(playerId, cooldown)).toBe(true);

      // Create a new store instance (simulates restart)
      const newStore = new DailyLeaderboardStore();
      expect(newStore.checkAndUpdateRateLimit(playerId, cooldown)).toBe(false);
  });
});
