import { AssetDescriptor, AssetHandle } from "./AssetTypes";
/**
 * AssetLoader for managing game assets with caching and reference counting.
 *
 * @responsibility Load and cache external resources (images, sounds, JSON).
 * @responsibility Manage resource lifecycle through reference counting.
 * @responsibility Ensure symmetry in asset loading/unloading.
 */
export declare class AssetLoader {
    private cache;
    private queue;
    private refCounts;
    /**
     * Enqueues assets for loading.
     */
    queueAssets(assets: AssetDescriptor[]): void;
    /**
     * Loads all enqueued assets asynchronously.
     * Increments reference counts for already loaded assets.
     */
    loadAll(): Promise<void>;
    /**
     * Gets an asset handle from the cache.
     */
    get<T>(id: string): AssetHandle<T>;
    /**
     * Manually increments the reference count.
     */
    incrementRef(id: string): void;
    /**
     * Unloads a group of assets, decrementing their reference counts.
     * Frees memory if the count reaches zero.
     */
    unloadGroup(ids: string[]): void;
    /**
     * Performs platform-specific resource disposal.
     */
    private disposeAsset;
    /**
     * Returns current loading progress.
     */
    progress(): {
        loaded: number;
        total: number;
        percent: number;
    };
    private performLoad;
    /**
     * Helper for preloading compatible with legacy systems.
     */
    preload(assets: Record<string, string>): Promise<void>;
    /**
     * Debug helper to detect memory leaks.
     */
    assertNoLeaks(): void;
}
