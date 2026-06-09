/**
 * Simple Save System using localStorage.
 * Supports versioned data with migration callbacks and game-specific keys.
 */
export interface SaveConfig<T> {
  key: string;
  version: number;
  migrate?: (oldData: unknown, oldVersion: number) => T;
}

/**
 * Sistema de persistencia simple utilizando localStorage.
 *
 * @conceptualRisk [DETERMINISM][LOW] El uso de `Date.now()` para el timestamp del save
 * no afecta la simulación pero es una fuente de tiempo real externa.
 */
export class SaveSystem<T> {
  private config: SaveConfig<T>;

  constructor(config: SaveConfig<T>) {
    this.config = config;
  }

  /**
   * Persists data to localStorage.
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
   * Returns null if no data exists or it is corrupted.
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
   */
  public clear(): void {
    localStorage.removeItem(this.config.key);
  }
}
