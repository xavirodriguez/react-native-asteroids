/**
 * Simple Save System using localStorage.
 * Supports versioned data with migration callbacks and game-specific keys.
 */
export interface SaveConfig<T> {
    key: string;
    version: number;
    migrate?: (oldData: any, oldVersion: number) => T;
}
export declare class SaveSystem<T> {
    private config;
    constructor(config: SaveConfig<T>);
    /**
     * Persists data to localStorage.
     */
    save(data: T): void;
    /**
     * Loads and migrates data from localStorage.
     * Returns null if no data exists or it is corrupted.
     */
    load(): T | null;
    /**
     * Clears saved data for this system's key.
     */
    clear(): void;
}
