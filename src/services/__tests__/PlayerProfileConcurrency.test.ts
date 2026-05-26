import { PlayerProfileService } from "../PlayerProfileService";
import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("@react-native-async-storage/async-storage", () => {
  let storage: Record<string, string> = {};
  return {
    setItem: jest.fn(async (key: string, value: string) => {
      storage[key] = value;
    }),
    getItem: jest.fn(async (key: string) => {
      return storage[key] || null;
    }),
    clear: jest.fn(async () => {
      storage = {};
    }),
    removeItem: jest.fn(async (key: string) => {
      delete storage[key];
    }),
  };
});

describe("PlayerProfileService Concurrency", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    // Force re-initialization of profile
    (PlayerProfileService as unknown).profile = null;
  });

  it("should handle concurrent XP updates correctly", async () => {
    // Fire off multiple concurrent updates
    const updates = [
      PlayerProfileService.addXP(100),
      PlayerProfileService.addXP(200),
      PlayerProfileService.addXP(300),
    ];

    await Promise.all(updates);

    const profile = await PlayerProfileService.getProfile();
    expect(profile.xp).toBe(600);
  });

  it("should handle concurrent stat updates correctly", async () => {
    const updates = [
      PlayerProfileService.updateStats("game1", { asteroidsDestroyed: 5 }),
      PlayerProfileService.updateStats("game1", { asteroidsDestroyed: 10 }),
    ];

    await Promise.all(updates);

    const profile = await PlayerProfileService.getProfile();
    expect(profile.stats.asteroidsDestroyed).toBe(15);
  });
});
