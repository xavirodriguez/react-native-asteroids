import { AssetDescriptor, AssetHandle, AssetType } from "./AssetTypes";

/**
 * AssetLoader for managing game assets with caching and reference counting.
 */
export class AssetLoader {
  private cache = new Map<string, AssetHandle>();
  private queue: AssetDescriptor[] = [];
  private refCounts = new Map<string, number>();

  /**
   * Registers assets to be loaded.
   */
  public queueAssets(assets: AssetDescriptor[]): void {
    this.queue.push(...assets);
  }

  /**
   * Loads all queued assets asynchronously.
   */
  public async loadAll(): Promise<void> {
    const promises = this.queue.map(async (desc) => {
      if (this.cache.has(desc.id)) {
        this.refCounts.set(desc.id, (this.refCounts.get(desc.id) || 0) + 1);
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
      }
    });

    this.queue = [];
    await Promise.all(promises);
  }

  /**
   * Retrieves an asset handle from the cache.
   */
  public get<T>(id: string): AssetHandle<T> {
    const handle = this.cache.get(id);
    if (!handle) {
      return { id, status: 'error', data: null, error: new Error(`Asset not found: ${id}`) };
    }
    return handle as AssetHandle<T>;
  }

  /**
   * Checks if an asset is ready.
   */
  public isReady(id: string): boolean {
    return this.cache.get(id)?.status === 'ready';
  }

  /**
   * Unloads a group of assets, decrementing their reference count.
   */
  public unloadGroup(ids: string[]): void {
    for (const id of ids) {
      const count = (this.refCounts.get(id) || 0) - 1;
      if (count <= 0) {
        this.cache.delete(id);
        this.refCounts.delete(id);
      } else {
        this.refCounts.set(id, count);
      }
    }
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
    // In a real RN environment, we would use fetch() or platform-specific APIs.
    // For now, we simulate the async loading.
    if (desc.type === 'json') {
      // simulate fetch
      return Promise.resolve({ success: true });
    }
    return Promise.resolve(desc.uri);
  }

  // Backward compatibility
  public async preload(assets: Record<string, string>): Promise<void> {
    const descriptors: AssetDescriptor[] = Object.entries(assets).map(([id, uri]) => ({
      id,
      uri,
      type: 'texture' // default for backward compat
    }));
    this.queueAssets(descriptors);
    await this.loadAll();
  }
}
