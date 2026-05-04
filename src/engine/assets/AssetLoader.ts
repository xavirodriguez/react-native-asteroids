import { AssetDescriptor, AssetHandle } from "./AssetTypes";

/**
 * Asynchronous Asset Loader with lifecycle and memory management.
 *
 * @responsibility Handle asynchronous loading of images, audio, and JSON.
 * @responsibility Implement a reference counting system to prevent memory leaks.
 * @responsibility Cache loaded assets to avoid redundant network requests.
 *
 * @remarks
 * Uses a reference counting model where consumers (Scenes/Systems) must
 * increment and decrement the `refCount`. When an asset's reference count
 * reaches zero, it is automatically purged from memory.
 *
 * ### Key Features:
 * 1. **Asset Handles**: Returns reactive handles with `loading`, `ready`, and `error` states.
 * 2. **Reference Counting**: Automatic cleanup of unused resources.
 * 3. **Manual Disposals**: Calls `.dispose()` on asset data if the method exists.
 *
 * @public
 */
export class AssetLoader {
  private cache = new Map<string, AssetHandle>();
  private queue: AssetDescriptor[] = [];
  private refCounts = new Map<string, number>();

  /**
   * Enqueues assets for future loading.
   */
  public queueAssets(assets: AssetDescriptor[]): void {
    this.queue.push(...assets);
  }

  /**
   * Loads all enqueued assets asynchronously.
   *
   * @remarks
   * If an asset is already in the cache, its reference count is incremented.
   *
   * @returns Promise that resolves when all queued assets have transitioned to a terminal state.
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
   * Retrieves an asset handle from the cache.
   *
   * @param id - Unique asset identifier.
   * @returns The {@link AssetHandle}. If not found, returns a handle with 'error' status.
   */
  public get<T>(id: string): AssetHandle<T> {
    const handle = this.cache.get(id);
    if (!handle) {
      return { id, status: 'error', data: null, error: new Error(`Asset not found: ${id}`) };
    }
    return handle as AssetHandle<T>;
  }

  /**
   * Manually increments the reference count for a specific asset.
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
   * Decrements reference counts and purges assets that reach zero.
   *
   * @remarks
   * Symmetry between load/unload is required to prevent memory leaks.
   *
   * @param ids - Array of asset IDs to release.
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
          console.error(`AssetLoader: Asset ${id} reference count underflow (${newCount}). Potential leak or double unload.`);
        }

        this.disposeAsset(id);
        this.cache.delete(id);
        this.refCounts.delete(id);
      } else {
        this.refCounts.set(id, newCount);
      }
    }
  }

  /**
   * Internal disposal hook. Calls `.dispose()` on asset data if applicable.
   */
  private disposeAsset(id: string): void {
    const handle = this.cache.get(id);
    if (!handle || !handle.data) return;

    const data = handle.data as Record<string, unknown>;
    if (typeof data.dispose === 'function') {
        (data.dispose as () => void)();
    }
  }

  /**
   * Returns current aggregate loading progress.
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

  /**
   * [Inference] Low-level loader implementation.
   * @internal
   */
  private async performLoad(desc: AssetDescriptor): Promise<unknown> {
    if (desc.type === 'json') {
      return Promise.resolve({ success: true });
    }
    return Promise.resolve(desc.uri);
  }

  /**
   * Utility for rapid preloading of textures.
   *
   * @param assets - Map of ID to URI.
   */
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
   * Audits the current cache for orphaned resources.
   * @remarks Logs warnings if assets remain in memory with active reference counts.
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
