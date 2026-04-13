import { Entity, AABB } from "../types/EngineTypes";
/**
 * A spatial hashing implementation to provide efficient broadphase collision detection (O(n log n)).
 * Divides the 2D world into a grid of cells and tracks which entities are in which cells.
 */
export declare class SpatialHash {
    cellSize: number;
    private grid;
    /**
     * Principle 6: Explicit Object Pool for entity lists.
     */
    private cellPool;
    constructor(cellSize: number);
    /**
     * Inserts an entity into all cells that its AABB overlaps.
     */
    insert(id: Entity, aabb: AABB): void;
    /**
     * Queries all entities in cells that the given AABB overlaps.
     * Returns a list of unique candidates.
     */
    query(aabb: AABB, result: Set<Entity>): void;
    /**
     * Clears the grid and returns lists to the pool.
     */
    clear(): void;
    /**
     * Principle 2: Enforces hierarchical and structural invariants.
     */
    assertValid(): void;
}
