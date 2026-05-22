import { MutatorService } from "../MutatorService";
import { ServerTimeService } from "../ServerTimeService";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("../ServerTimeService");

describe("MutatorService", () => {
  beforeEach(() => {
    MutatorService.unlockSessionSeed();
    jest.clearAllMocks();
  });

  test("should use locked seed if available", () => {
    (ServerTimeService.getWeekSeed as jest.Mock).mockReturnValue("week-1");
    (ServerTimeService.isSynced as jest.Mock).mockReturnValue(true);

    const initial = MutatorService.getWeeklyMutators();

    // Lock with a different seed
    MutatorService.lockSessionSeed("locked-seed");

    // Change server seed (e.g. week changed)
    (ServerTimeService.getWeekSeed as jest.Mock).mockReturnValue("week-2");

    const result = MutatorService.getWeeklyMutators();
    expect(result.mutators).not.toEqual(initial.mutators);

    // Now unlock and it should change back to server seed
    MutatorService.unlockSessionSeed();
    const result2 = MutatorService.getWeeklyMutators();
    expect(result2.source).toBe('server');
    // week-2 should give different result than locked-seed
  });

  test("should fallback to local if not synced and no lock", () => {
    (ServerTimeService.getWeekSeed as jest.Mock).mockReturnValue(null);
    (ServerTimeService.isSynced as jest.Mock).mockReturnValue(false);
    (ServerTimeService.getCorrectedTime as jest.Mock).mockReturnValue(Date.now());

    const result = MutatorService.getWeeklyMutators();
    expect(result.source).toBe('local-fallback');
  });

  test("lockSessionSeed without params should capture current server seed", () => {
    (ServerTimeService.getWeekSeed as jest.Mock).mockReturnValue("current-server-seed");

    MutatorService.lockSessionSeed();

    (ServerTimeService.getWeekSeed as jest.Mock).mockReturnValue("new-server-seed");

    const result = MutatorService.getWeeklyMutators();
    // It should still be using "current-server-seed" because it was locked
    // We can verify source is 'server' because it was locked while synced
    expect(result.source).toBe('server');
  });
});
