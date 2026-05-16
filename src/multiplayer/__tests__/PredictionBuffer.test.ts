import { PredictionBuffer } from "../PredictionBuffer";
import { PredictedState } from "../NetTypes";

describe("PredictionBuffer", () => {
  let buffer: PredictionBuffer;

  beforeEach(() => {
    buffer = new PredictionBuffer(5);
  });

  it("should provide O(1) lookups via getAt", () => {
    const state: PredictedState = {
      tick: 10,
      entityId: "1",
      state: { x: 100, y: 100 },
      entities: []
    };
    buffer.save(state);
    expect(buffer.getAt(10)).toBe(state);
  });

  it("should prune oldest entries when max size is reached", () => {
    for (let i = 1; i <= 6; i++) {
      buffer.save({ tick: i, entityId: "1", state: { x: i, y: i }, entities: [] });
    }
    expect(buffer.getAt(1)).toBeUndefined();
    expect(buffer.getAt(2)).toBeDefined();
    expect(buffer.getAt(6)).toBeDefined();
  });

  it("should correctly handle clearBefore", () => {
    for (let i = 1; i <= 5; i++) {
      buffer.save({ tick: i, entityId: "1", state: { x: i, y: i }, entities: [] });
    }
    buffer.clearBefore(3);
    expect(buffer.getAt(1)).toBeUndefined();
    expect(buffer.getAt(2)).toBeUndefined();
    expect(buffer.getAt(3)).toBeUndefined();
    expect(buffer.getAt(4)).toBeDefined();
    expect(buffer.getAt(5)).toBeDefined();
  });

  it("should replace state when saving same tick", () => {
    const s1: PredictedState = { tick: 1, entityId: "1", state: { x: 1, y: 1 }, entities: [] };
    const s2: PredictedState = { tick: 1, entityId: "1", state: { x: 2, y: 2 }, entities: [] };
    buffer.save(s1);
    buffer.save(s2);
    expect(buffer.getAt(1)).toBe(s2);
  });
});
