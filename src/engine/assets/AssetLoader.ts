/**
 * AssetLoader for preloading and caching game assets (images, SVGs).
 */
export class AssetLoader {
  private cache: Map<string, any> = new Map();
  private refCounts: Map<string, number> = new Map();

  /**
   * Preload assets and increment reference counts.
   *
   * @param assets - A dictionary of asset paths/keys to preload.
   * @returns A promise that resolves when all assets are loaded.
   */
  public async preload(assets: Record<string, string>): Promise<void> {
    const promises = Object.entries(assets).map(async ([key, path]) => {
      if (!this.cache.has(key)) {
        const asset = await this.loadAsset(path);
        this.cache.set(key, asset);
        this.refCounts.set(key, 0);
      }
      this.refCounts.set(key, (this.refCounts.get(key) || 0) + 1);
    });

    await Promise.all(promises);
  }

  /**
   * Unloads assets by decrementing reference counts.
   * Assets are removed from cache when reference count reaches zero.
   *
   * @param keys - List of asset keys to unload.
   */
  public unload(keys: string[]): void {
    keys.forEach((key) => {
      const count = (this.refCounts.get(key) || 0) - 1;
      if (count <= 0) {
        this.cache.delete(key);
        this.refCounts.delete(key);
        // In a real environment, we would also call asset.release() if needed
      } else {
        this.refCounts.set(key, count);
      }
    });
  }

  /**
   * Loads a single asset based on its path and type.
   */
  private async loadAsset(path: string): Promise<any> {
    // Placeholder logic for Expo/React Native asset loading
    // In a real implementation, this would use Asset.fromModule() or similar.
    return Promise.resolve(path);
  }

  /**
   * Retrieves an asset from the cache.
   */
  public get(key: string): any {
    return this.cache.get(key);
  }
}
