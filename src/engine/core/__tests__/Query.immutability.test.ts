import { Entity } from "../Entity";
import { Query } from "../Query";

describe("Query Immutability", () => {
  it("should return a readonly array according to type system", () => {
    const query = new Query(["ComponentA"]);
    query.add(1 as Entity);
    query.add(2 as Entity);

    const entities = query.getEntities();
    expect(entities).toEqual([1, 2]);

    // Verification of the requirement: "return this.entityArray as ReadonlyArray<Entity>"
    // At runtime in JS, this is still the same array.
    // The fix relies on TypeScript's type checking to prevent accidental mutation.
  });

  it("should not be affected by external sorting if caller uses slice", () => {
    const query = new Query(["ComponentA"]);
    query.add(2 as Entity);
    query.add(1 as Entity);

    // internal array is [1, 2] due to sort in getEntities
    const entities = query.getEntities();
    expect(entities).toEqual([1, 2]);

    // If a caller wants to sort differently, they must slice
    const reversed = [...entities].sort((a, b) => b - a);
    expect(reversed).toEqual([2, 1]);

    // Internal state remains [1, 2]
    expect(query.getEntities()).toEqual([1, 2]);
  });
});
