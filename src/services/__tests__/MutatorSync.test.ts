import { MutatorService } from "../MutatorService";
import { ServerTimeService } from "../ServerTimeService";

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe("MutatorService & ServerTimeService Sync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-expect-error - Resetting private static for tests
    MutatorService.cachedSeed = null;
    // @ts-expect-error - Resetting private static for tests
    MutatorService.cachedMutators = null;
    MutatorService.unlockSessionSeed();
    // @ts-expect-error - Resetting private static for tests
    ServerTimeService.timeOffset = 0;
    // @ts-expect-error - Resetting private static for tests
    ServerTimeService.metadata = null;
    // @ts-expect-error - Resetting private static for tests
    ServerTimeService.lastSync = 0;
  });

  test("deterministic seed from server overrides local time", () => {
    const serverSeed = "2024-W10";
    // @ts-expect-error - Setting private for test
    ServerTimeService.metadata = { serverTime: Date.now(), weekSeed: serverSeed };
    // @ts-expect-error - Setting private for test
    ServerTimeService.lastSync = Date.now();

    const { mutators, source } = MutatorService.getWeeklyMutators();
    expect(source).toBe('server');
    expect(mutators.length).toBeGreaterThan(0);

    // @ts-expect-error - Checking internal state
    expect(MutatorService.cachedSeed).toBe(serverSeed);
  });

  test("fallback to local ISO week if server sync fails", () => {
    const localDate = new Date("2024-01-01T12:00:00Z"); // Week 1
    jest.spyOn(Date, 'now').mockReturnValue(localDate.getTime());

    const { source } = MutatorService.getWeeklyMutators();
    expect(source).toBe('local-fallback');
    // @ts-expect-error - Checking internal state
    expect(MutatorService.cachedSeed).toBe(1);
  });

  test("large clock drift warning", async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        serverTime: Date.now() + 10 * 60 * 1000, // 10 min offset
        weekSeed: "2024-W1"
      })
    });

    await ServerTimeService.syncTime();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Large clock drift detected"));
  });
});
