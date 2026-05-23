import { MutatorService } from "../MutatorService";
import { ServerTimeService } from "../ServerTimeService";

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe("MutatorService & ServerTimeService Robustness", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MutatorService.unlockSessionSeed();
    // @ts-expect-error - Resetting private static for tests
    MutatorService.cachedSeed = null;
    // @ts-expect-error - Resetting private static for tests
    ServerTimeService.timeOffset = 0;
    // @ts-expect-error - Resetting private static for tests
    ServerTimeService.metadata = null;
    // @ts-expect-error - Resetting private static for tests
    ServerTimeService.lastSync = 0;
  });

  test("seed locking persists even if server time transitions", () => {
    // 1. Initial sync
    // @ts-expect-error - Setting private for test
    ServerTimeService.metadata = { serverTime: Date.now(), weekSeed: "2024-W1" };
    // @ts-expect-error - Setting private for test
    ServerTimeService.lastSync = Date.now();

    const initial = MutatorService.getWeeklyMutators();
    expect(initial.source).toBe("server");

    // 2. Lock session
    MutatorService.lockSessionSeed();

    // 3. Server transitions to next week
    // @ts-expect-error - Setting private for test
    ServerTimeService.metadata = { serverTime: Date.now(), weekSeed: "2024-W2" };

    const afterTransition = MutatorService.getWeeklyMutators();
    // Seed should still be W1 because it's locked
    expect(afterTransition.mutators).toEqual(initial.mutators);
    // @ts-expect-error - checking internal
    expect(MutatorService.lockedSeed).toBe("2024-W1");
  });

  test("canStartMultiplayer requirements", () => {
    expect(ServerTimeService.canStartMultiplayer()).toBe(false);

    // @ts-expect-error - Setting private for test
    ServerTimeService.lastSync = Date.now();
    // @ts-expect-error - Setting private for test
    ServerTimeService.metadata = { serverTime: Date.now(), weekSeed: "2024-W1" };

    expect(ServerTimeService.canStartMultiplayer()).toBe(true);
  });

  test("deterministic hash consistency", () => {
    const seed = "stable-seed";
    const m1 = MutatorService.getWeeklyMutators(seed);
    const m2 = MutatorService.getWeeklyMutators(seed);
    expect(m1.mutators).toEqual(m2.mutators);
  });

  test("UTC consistency in local fallback", () => {
     // Sunday late night in some timezones might be Monday in UTC
     const sundayNight = new Date("2024-03-10T23:30:00Z"); // This is a Sunday
     // @ts-expect-error - checking internal
     const weekNum = MutatorService.getISOWeekNumber(sundayNight);

     // 2024-03-10 is in week 10
     expect(weekNum).toBe(10);
  });
});
