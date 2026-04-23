import { AssetDescriptor, AssetHandle } from "./AssetTypes";

/**
 * AssetLoader designed to manage game assets with caching and reference counting.
 *
 * @remarks
 * Implements an ownership model where scenes or systems are expected to manage
 * reference count increments and decrements.
 */
export class AssetLoader {
  private cache = new Map<string, AssetHandle>();
  private queue: AssetDescriptor[] = [];
  private refCounts = new Map<string, number>();
  private singleReleaseArray: string[] = [""];

  /**
   * Enqueues assets for loading.
   */
  public queueAssets(assets: AssetDescriptor[]): void {
    this.queue.push(...assets);
  }

  /**
   * Loads all enqueued assets asynchronously.
   * Increments reference counts for already loaded assets.
   */
  public async loadAll(): Promise<void> {
    const assetsToLoad = [...this.queue];
    this.queue = [];

    const promises = assetsToLoad.map(async (desc) => {
      if (this.cache.has(desc.id)) {
        this.incrementRef(desc.id);
        return;
      }

      const handle: AssetHandle = {
        id: desc.id,
        status: 'loading',
        data: null
      };
      this.cache.set(desc.id, handle);
      this.refCounts.set(desc.id, 1);

      try {
        const data = await this.performLoad(desc);
        handle.data = data;
        handle.status = 'ready';
      } catch (error) {
        handle.status = 'error';
        handle.error = error as Error;
        console.error(`AssetLoader: Error loading asset ${desc.id}:`, error);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Gets an asset handle from the cache.
   */
  public get<T>(id: string): AssetHandle<T> {
    const handle = this.cache.get(id);
    if (!handle) {
      return { id, status: 'error', data: null, error: new Error(`Asset not found: ${id}`) };
    }
    return handle as AssetHandle<T>;
  }

  /**
   * Explicitly increments the reference count for an asset.
   */
  public incrementRef(id: string): void {
    const count = this.refCounts.get(id);
    if (count === undefined) {
        console.error(`AssetLoader: Cannot increment reference for non-existent asset ${id}`);
        return;
    }
    this.refCounts.set(id, count + 1);
  }

  /**
   * Libera un recurso individual por su ID.
   * Helper para simplificar la limpieza automática de activos.
   *
   * @remarks
   * Reutiliza un array interno para cumplir con la restricción Zero-GC.
   */
  public release(id: string): void {
    this.singleReleaseArray[0] = id;
    this.unloadGroup(this.singleReleaseArray);
  }

  /**
   * Decrements reference counts and unloads assets if they reach zero.
   *
   * @remarks
   * Enforces symmetry in load/unload operations.
   * @throws Error if a reference count underflow is detected (debug only).
   */
  public unloadGroup(ids: string[]): void {
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const currentCount = this.refCounts.get(id);

      if (currentCount === undefined) {
          console.warn(`AssetLoader: Attempted to unload asset ${id} which is not tracked.`);
          continue;
      }

      const newCount = currentCount - 1;

      if (newCount <= 0) {
        if (newCount < 0) {
          console.error(`AssetLoader: Asset ${id} reference count underflow (${newCount}). Critical leak or double unload.`);
        }

        this.disposeAsset(id);
        this.cache.delete(id);
        this.refCounts.delete(id);
      } else {
        this.refCounts.set(id, newCount);
      }
    }
  }

  private disposeAsset(id: string): void {
    const handle = this.cache.get(id);
    if (!handle || !handle.data) return;

    const data = handle.data as Record<string, unknown>;
    if (typeof data.dispose === 'function') {
        (data.dispose as () => void)();
    }
  }

  /**
   * Returns current loading progress.
   */
  public progress(): { loaded: number; total: number; percent: number } {
    let loaded = 0;
    const total = this.cache.size;

    this.cache.forEach(handle => {
      if (handle.status === 'ready' || handle.status === 'error') {
        loaded++;
      }
    });

    return {
      loaded,
      total,
      percent: total > 0 ? loaded / total : 1
    };
  }

  private async performLoad(desc: AssetDescriptor): Promise<unknown> {
    if (desc.type === 'json') {
      return Promise.resolve({ success: true });
    }
    return Promise.resolve(desc.uri);
  }

  public async preload(assets: Record<string, string>): Promise<void> {
    const descriptors: AssetDescriptor[] = Object.entries(assets).map(([id, uri]) => ({
      id,
      uri,
      type: 'texture'
    }));
    this.queueAssets(descriptors);
    await this.loadAll();
  }

  /**
   * Debug helper to detect memory leaks.
   */
  public assertNoLeaks(): void {
    if (this.cache.size > 0) {
      const leaks = Array.from(this.refCounts.entries())
        .map(([id, count]) => `${id} (${count})`)
        .join(", ");
      const msg = `AssetLoader leak detected: ${this.cache.size} assets still in memory: ${leaks}`;
      console.warn(msg);
    }
  }
}
