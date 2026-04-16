/**
 * @packageDocumentation
 * Resource Management and Loading Pipeline.
 * Handles the asynchronous loading, caching, and reference counting of game assets.
 */

import { AssetDescriptor, AssetHandle } from "./AssetTypes";

/**
 * AssetLoader for managing game assets with caching and reference counting.
 *
 * @remarks
 * This class implements a strict ownership model. Scenes or systems must increment
 * and decrement reference counts when they start/stop using an asset. When the count
 * reaches zero, the asset is automatically disposed and removed from cache.
 *
 * It includes debug assertions to detect common pitfalls like memory leaks
 * or double-unload operations.
 *
 * @responsibility Asynchronous loading of textures, audio, JSON, and fonts.
 * @responsibility Centralized cache for shared resources.
 * @responsibility Reference counting to automate lifecycle and memory management.
 *
 * @example
 * ```ts
 * const loader = new AssetLoader();
 * loader.queueAssets([{ id: "hero", type: "texture", uri: "/sprites/hero.png" }]);
 * await loader.loadAll();
 * const heroTexture = loader.get("hero").data;
 * // ... later ...
 * loader.unloadGroup(["hero"]);
 * ```
 */
export class AssetLoader {
  /** Internal cache mapping asset IDs to their state handles. */
  private cache = new Map<string, AssetHandle>();
  /** Pending asset descriptors waiting to be loaded. */
  private queue: AssetDescriptor[] = [];
  /** Reference counts per asset ID. */
  private refCounts = new Map<string, number>();

  /**
   * Enqueues assets for loading in the next `loadAll` call.
   *
   * @param assets - Array of descriptors defining the resources to fetch.
   * @postcondition Descriptors are added to the internal queue.
   */
  public queueAssets(assets: AssetDescriptor[]): void {
    this.queue.push(...assets);
  }

  /**
   * Loads all enqueued assets asynchronously.
   *
   * @remarks
   * For already loaded assets in the queue, it simply increments their reference count.
   * For new assets, it creates a 'loading' handle, performs the IO, and then updates the status.
   *
   * @returns A promise that resolves when all queued assets are either ready or in an error state.
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
   *
   * @param id - The unique asset identifier.
   * @returns A handle containing the status and (if ready) the loaded data.
   *
   * @remarks
   * This method does NOT increment the reference count.
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
   * Useful when sharing an already loaded asset between systems.
   *
   * @param id - The asset identifier.
   * @mutates refCounts
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
   * Decrements reference counts and unloads assets if they reach zero.
   *
   * @param ids - Array of asset identifiers to release.
   *
   * @remarks
   * Enforces symmetry in load/unload operations. If an asset is released more
   * times than it was loaded/referenced, a warning is issued.
   *
   * @throws Error (via console.error) if a reference count underflow is detected.
   * @mutates cache, refCounts
   * @sideEffect Calls `dispose()` on the asset data if the method exists.
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

  /**
   * Internal helper to trigger resource cleanup.
   */
  private disposeAsset(id: string): void {
    const handle = this.cache.get(id);
    if (!handle || !handle.data) return;

    const data = handle.data as Record<string, unknown>;
    // Generic cleanup hook for heavy resources like textures or sound buffers
    if (typeof data.dispose === 'function') {
        (data.dispose as () => void)();
    }
  }

  /**
   * Returns current loading progress summary.
   *
   * @returns Object with loaded count, total count, and normalized percentage (0.0 to 1.0).
   * @queries cache
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

  /**
   * Platform-specific loading implementation.
   * @remarks Currently simplified for documentation purposes.
   */
  private async performLoad(desc: AssetDescriptor): Promise<unknown> {
    if (desc.type === 'json') {
      return Promise.resolve({ success: true });
    }
    return Promise.resolve(desc.uri);
  }

  /**
   * Helper for quick preloading of multiple texture assets.
   *
   * @param assets - Map of ID to URI strings.
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
   * Logs a warning if any assets remain in memory with a positive reference count.
   *
   * @remarks
   * Recommended to call this during scene transitions or at the end of a session.
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
