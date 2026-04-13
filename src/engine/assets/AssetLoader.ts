import { AssetDescriptor, AssetHandle } from "./AssetTypes";

/**
 * AssetLoader for managing game assets with caching and reference counting.
 *
 * @responsibility Load and cache external resources (images, sounds, JSON).
 * @responsibility Manage resource lifecycle through reference counting.
 * @responsibility Ensure symmetry in asset loading/unloading.
 */
export class AssetLoader {
  private cache = new Map<string, AssetHandle>();
  private queue: AssetDescriptor[] = [];
  private refCounts = new Map<string, number>();

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
        console.error(`Error loading asset ${desc.id}:`, error);
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
   * Manually increments the reference count.
   */
  public incrementRef(id: string): void {
    const count = this.refCounts.get(id) || 0;
    this.refCounts.set(id, count + 1);
  }

  /**
   * Unloads a group of assets, decrementing their reference counts.
   * Frees memory if the count reaches zero.
   */
  public unloadGroup(ids: string[]): void {
    for (const id of ids) {
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

        // Resource disposal hook (placeholder for platform-specific cleanup)
        this.disposeAsset(id);

        this.cache.delete(id);
        this.refCounts.delete(id);
      } else {
        this.refCounts.set(id, newCount);
      }
    }
  }

  /**
   * Performs platform-specific resource disposal.
   */
  private disposeAsset(id: string): void {
    const handle = this.cache.get(id);
    if (!handle || !handle.data) return;

    // Example: If data has a dispose method, call it.
    if (typeof (handle.data as any).dispose === 'function') {
        (handle.data as any).dispose();
    }

    // In a real environment, we'd add logic for specific types:
    // e.g., if (handle.type === 'texture') WebGL.deleteTexture(handle.data);
  }

  /**
   * Returns current loading progress.
   */
  public progress(): { loaded: number; total: number; percent: number } {
    let loaded = 0;
    const total = this.cache.size;

    for (const handle of this.cache.values()) {
      if (handle.status === 'ready' || handle.status === 'error') {
        loaded++;
      }
    }

    return {
      loaded,
      total,
      percent: total > 0 ? loaded / total : 1
    };
  }

  private async performLoad(desc: AssetDescriptor): Promise<any> {
    // Simulated load for engine environment
    if (desc.type === 'json') {
      return Promise.resolve({ success: true });
    }
    return Promise.resolve(desc.uri);
  }

  /**
   * Helper for preloading compatible with legacy systems.
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
   * Debug helper to detect memory leaks.
   */
  public assertNoLeaks(): void {
    if (this.cache.size > 0) {
      const leaks = Array.from(this.refCounts.entries())
        .map(([id, count]) => `${id} (${count})`)
        .join(", ");
      console.warn(`AssetLoader leak detected: ${this.cache.size} assets still in memory: ${leaks}`);
    }
  }
}
