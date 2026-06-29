"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetLoader = void 0;
/**
 * Platform-agnostic coordinator for asset loading and caching.
 *
 * @remarks
 * This class delegates the actual loading of platform-specific resources
 * (e.g. browser `Image` or React Native assets) to an injected `IAssetProvider`.
 * It provides a unified interface for queuing and retrieving loaded assets.
 *
 * @warning
 * **Resource Management**: The `AssetLoader` caches resources indefinitely.
 * Manual clearing may be required for long-running sessions to prevent
 * excessive memory usage.
 */
class AssetLoader {
    provider;
    cache = new Map();
    queue = [];
    constructor(provider) {
        this.provider = provider;
    }
    setProvider(provider) {
        this.provider = provider;
    }
    queueAssets(assets) {
        this.queue.push(...assets);
    }
    async load(assets) {
        if (!this.provider) {
            console.warn("No AssetProvider set for AssetLoader");
            return;
        }
        const promises = assets.map(async (asset) => {
            if (this.cache.has(asset.id))
                return;
            let loadedAsset;
            switch (asset.type) {
                case "image":
                case "texture":
                    loadedAsset = await this.provider.loadImage(asset.path);
                    break;
                case "audio":
                    loadedAsset = await this.provider.loadAudio(asset.path);
                    break;
                case "font":
                    loadedAsset = await this.provider.loadFont(asset.path);
                    break;
                case "json":
                    if (this.provider.load) {
                        loadedAsset = await this.provider.load(asset.path);
                    }
                    break;
            }
            this.cache.set(asset.id, loadedAsset);
        });
        await Promise.all(promises);
    }
    async loadAll() {
        if (this.queue.length === 0)
            return;
        await this.load(this.queue);
        this.queue = [];
    }
    get(id) {
        return this.cache.get(id);
    }
}
exports.AssetLoader = AssetLoader;
