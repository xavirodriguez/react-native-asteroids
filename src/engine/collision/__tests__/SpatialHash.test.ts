import { SpatialHash } from "../SpatialHash";
import { Entity, AABB } from "../../types/EngineTypes";

describe("SpatialHash", () => {
  let spatialHash: SpatialHash;

  beforeEach(() => {
    spatialHash = new SpatialHash(100);
  });

  it("should find entities in the same cell", () => {
    const aabb1: AABB = { minX: 10, minY: 10, maxX: 20, maxY: 20 };
    const aabb2: AABB = { minX: 30, minY: 30, maxX: 40, maxY: 40 };

    spatialHash.insert(1, aabb1);
    spatialHash.insert(2, aabb2);

    const result = new Set<Entity>();
    spatialHash.query({ minX: 0, minY: 0, maxX: 50, maxY: 50 }, result);

    expect(result.has(1)).toBe(true);
    expect(result.has(2)).toBe(true);
  });

  it("should not find entities in different cells", () => {
    const aabb1: AABB = { minX: 10, minY: 10, maxX: 20, maxY: 20 };
    const aabb2: AABB = { minX: 110, minY: 110, maxX: 120, maxY: 120 };

    spatialHash.insert(1, aabb1);
    spatialHash.insert(2, aabb2);

    const result = new Set<Entity>();
    spatialHash.query({ minX: 0, minY: 0, maxX: 50, maxY: 50 }, result);

    expect(result.has(1)).toBe(true);
    expect(result.has(2)).toBe(false);
  });

  it("should handle AABB overlapping multiple cells", () => {
    const aabb: AABB = { minX: 90, minY: 90, maxX: 110, maxY: 110 };
    spatialHash.insert(1, aabb);

    const result1 = new Set<Entity>();
    spatialHash.query({ minX: 0, minY: 0, maxX: 95, maxY: 95 }, result1);
    expect(result1.has(1)).toBe(true);

    const result2 = new Set<Entity>();
    spatialHash.query({ minX: 105, minY: 105, maxX: 150, maxY: 150 }, result2);
    expect(result2.has(1)).toBe(true);
  });

  it("should clear the grid", () => {
    spatialHash.insert(1, { minX: 10, minY: 10, maxX: 20, maxY: 20 });
    spatialHash.clear();

    const result = new Set<Entity>();
    spatialHash.query({ minX: 0, minY: 0, maxX: 100, maxY: 100 }, result);
    expect(result.size).toBe(0);
  });
});
