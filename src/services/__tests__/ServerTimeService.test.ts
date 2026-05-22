import { ServerTimeService } from "../ServerTimeService";

describe("ServerTimeService", () => {
  beforeEach(() => {
    // Reset state since it's a static service
    (ServerTimeService as any).timeOffset = 0;
    (ServerTimeService as any).lastSync = 0;
    (ServerTimeService as any).metadata = null;

    global.fetch = jest.fn();
  });

  test("syncTime should calculate correct offset", async () => {
    const serverTime = Date.now() + 5000;
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        serverTime,
        weekSeed: "2023-W10"
      })
    });

    await ServerTimeService.syncTime();

    expect(ServerTimeService.isSynced()).toBe(true);
    expect(ServerTimeService.getTimeOffset()).toBeCloseTo(5000, -2);
    expect(ServerTimeService.getCorrectedTime()).toBeCloseTo(Date.now() + 5000, -2);
    expect(ServerTimeService.getWeekSeed()).toBe("2023-W10");
  });

  test("hasLargeDrift should return true if offset > 5 minutes", () => {
    (ServerTimeService as any).timeOffset = 6 * 60 * 1000;
    expect(ServerTimeService.hasLargeDrift()).toBe(true);

    (ServerTimeService as any).timeOffset = 1 * 60 * 1000;
    expect(ServerTimeService.hasLargeDrift()).toBe(false);
  });

  test("canStartMultiplayer requires sync and metadata", () => {
    expect(ServerTimeService.canStartMultiplayer()).toBe(false);

    (ServerTimeService as any).lastSync = Date.now();
    (ServerTimeService as any).metadata = { serverTime: Date.now(), weekSeed: "test" };

    expect(ServerTimeService.canStartMultiplayer()).toBe(true);
  });
});
