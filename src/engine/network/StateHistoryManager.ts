import { WorldSnapshot } from "../types/EngineTypes";

/**
 * Manages a rolling history of world states (snapshots) for rollback reconciliation.
 *
 * @remarks
 * In Rollback Netcode, we need to keep a history of states to rewind the simulation
 * when a mis-prediction is detected. This manager provides O(1) access to states
 * by tick and efficient pruning of states that are older than the maximum rollback window.
 */
export class StateHistoryManager {
    private history = new Map<number, WorldSnapshot>();
    private tickKeys: number[] = [];
    private maxSize: number;

    /**
     * @param maxSize - Maximum number of snapshots to retain.
     */
    constructor(maxSize: number = 120) {
        this.maxSize = maxSize;
    }

    /**
     * Saves a snapshot for a specific tick.
     *
     * @param tick - The simulation tick.
     * @param snapshot - The world state snapshot.
     */
    public save(tick: number, snapshot: WorldSnapshot): void {
        if (!this.history.has(tick)) {
            this.tickKeys.push(tick);
            // Ensure tickKeys stays sorted to facilitate pruning if needed,
            // though push+sort is less efficient than keeping it sorted.
            // Usually, ticks arrive in order.
            if (this.tickKeys.length > 1 && this.tickKeys[this.tickKeys.length - 1] < this.tickKeys[this.tickKeys.length - 2]) {
                this.tickKeys.sort((a, b) => a - b);
            }
        }
        this.history.set(tick, snapshot);

        if (this.history.size > this.maxSize) {
            this.pruneOldest();
        }
    }

    /**
     * Retrieves a snapshot for a specific tick.
     */
    public get(tick: number): WorldSnapshot | undefined {
        return this.history.get(tick);
    }

    /**
     * Removes all snapshots older than the specified tick.
     */
    public pruneBefore(tick: number): void {
        while (this.tickKeys.length > 0 && this.tickKeys[0] < tick) {
            const oldestTick = this.tickKeys.shift()!;
            this.history.delete(oldestTick);
        }
    }

    private pruneOldest(): void {
        if (this.tickKeys.length > 0) {
            const oldestTick = this.tickKeys.shift()!;
            this.history.delete(oldestTick);
        }
    }

    /**
     * Clears all history.
     */
    public clear(): void {
        this.history.clear();
        this.tickKeys = [];
    }

    /**
     * Returns the number of snapshots currently stored.
     */
    public getSize(): number {
        return this.history.size;
    }

    /**
     * Returns the oldest tick currently stored.
     */
    public getOldestTick(): number | undefined {
        return this.tickKeys.length > 0 ? this.tickKeys[0] : undefined;
    }

    /**
     * Returns the latest tick currently stored.
     */
    public getLatestTick(): number | undefined {
        return this.tickKeys.length > 0 ? this.tickKeys[this.tickKeys.length - 1] : undefined;
    }
}
