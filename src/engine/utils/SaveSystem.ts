/**
 * @packageDocumentation
 * Persistence System.
 * Provides a versioned wrapper around `localStorage` for saving and loading game state.
 */

/**
 * Configuration for a specific save slot/key.
 *
 * @template T - The structure of the data being persisted.
 */
export interface SaveConfig<T> {
  /** The unique key used in localStorage. */
  key: string;
  /** Current schema version. Used to trigger migrations. */
  version: number;
  /**
   * Optional callback to transform old data into the current version's format.
   *
   * @param oldData - The raw data recovered from storage.
   * @param oldVersion - The version number saved with that data.
   * @returns Migrated data conforming to type T.
   */
  migrate?: (oldData: unknown, oldVersion: number) => T;
}

/**
 * Simple Save System using localStorage.
 * Supports versioned data with migration callbacks and game-specific keys.
 *
 * @remarks
 * Data is wrapped in an 'envelope' that includes the version and a timestamp
 * before being stringified and stored.
 *
 * @responsibility Persist arbitrary data structures to browser local storage.
 * @responsibility Handle data migration between different versions of the game.
 *
 * @template T - The structure of the game state to be saved.
 */
export class SaveSystem<T> {
  /** Configuration for this save instance. */
  private config: SaveConfig<T>;

  /**
   * Creates a new SaveSystem.
   * @param config - Key, version, and migration rules.
   */
  constructor(config: SaveConfig<T>) {
    this.config = config;
  }

  /**
   * Persists data to localStorage.
   *
   * @param data - The state object to save.
   * @sideEffect Writes to browser `localStorage`.
   */
  public save(data: T): void {
    const envelope = {
      version: this.config.version,
      data: data,
      timestamp: Date.now(),
    };
    try {
      localStorage.setItem(this.config.key, JSON.stringify(envelope));
    } catch (e) {
      console.warn(`Failed to save data for key "${this.config.key}":`, e);
    }
  }

  /**
   * Loads and migrates data from localStorage.
   *
   * @returns The loaded/migrated data of type T, or `null` if no data exists or it is corrupted.
   *
   * @remarks
   * If the stored version is lower than the current config version, it attempts
   * to call the `migrate` function. If no migration is provided for a version
   * mismatch, it returns `null` and logs a warning.
   */
  public load(): T | null {
    const raw = localStorage.getItem(this.config.key);
    if (!raw) return null;

    try {
      const envelope = JSON.parse(raw);
      if (envelope.version === this.config.version) {
        return envelope.data as T;
      }

      // Handle migrations
      if (this.config.migrate) {
        return this.config.migrate(envelope.data, envelope.version);
      } else {
        console.warn(`Save version mismatch for "${this.config.key}" and no migration provided.`);
        return null;
      }
    } catch (e) {
      console.warn(`Failed to load or parse data for key "${this.config.key}":`, e);
      return null;
    }
  }

  /**
   * Clears saved data for this system's key.
   * @sideEffect Removes entry from `localStorage`.
   */
  public clear(): void {
    localStorage.removeItem(this.config.key);
  }
}
