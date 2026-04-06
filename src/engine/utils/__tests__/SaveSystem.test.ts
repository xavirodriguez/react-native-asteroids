import { SaveSystem } from "../SaveSystem";

describe("SaveSystem", () => {
  const mockStorage: Record<string, string> = {};

  beforeEach(() => {
    // Mock localStorage
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: jest.fn((key) => mockStorage[key] || null),
        setItem: jest.fn((key, value) => { mockStorage[key] = value; }),
        removeItem: jest.fn((key) => { delete mockStorage[key]; }),
        clear: jest.fn(() => { for (const key in mockStorage) delete mockStorage[key]; }),
      },
      writable: true,
    });
    for (const key in mockStorage) delete mockStorage[key];
  });

  it("should save and load data correctly", () => {
    interface GameSave { score: number; level: number; }
    const saveSystem = new SaveSystem<GameSave>({ key: "test_game", version: 1 });

    const data: GameSave = { score: 100, level: 5 };
    saveSystem.save(data);

    const loaded = saveSystem.load();
    expect(loaded).toEqual(data);
  });

  it("should return null if no data exists", () => {
    const saveSystem = new SaveSystem<any>({ key: "test_game", version: 1 });
    expect(saveSystem.load()).toBeNull();
  });

  it("should handle version migration", () => {
    interface V1Data { score: number; }
    interface V2Data { score: number; level: number; }

    const oldData: V1Data = { score: 50 };
    const oldEnvelope = { version: 1, data: oldData };
    mockStorage["migration_test"] = JSON.stringify(oldEnvelope);

    const migrate = jest.fn((data: V1Data, version: number) => ({
      ...data,
      level: version === 1 ? 1 : 0,
    }));

    const saveSystem = new SaveSystem<V2Data>({
      key: "migration_test",
      version: 2,
      migrate,
    });

    const loaded = saveSystem.load();
    expect(loaded).toEqual({ score: 50, level: 1 });
    expect(migrate).toHaveBeenCalledWith(oldData, 1);
  });

  it("should clear saved data", () => {
    const saveSystem = new SaveSystem<any>({ key: "clear_test", version: 1 });
    saveSystem.save({ foo: "bar" });
    saveSystem.clear();
    expect(saveSystem.load()).toBeNull();
  });
});
