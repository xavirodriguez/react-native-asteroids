export interface AssetDescriptor {
  id: string;
  path: string;
  type: "image" | "audio" | "font" | "texture" | "json";
}

export interface IAssetProvider {
  loadImage(path: string): Promise<unknown>;
  loadAudio(path: string): Promise<unknown>;
  loadFont(path: string): Promise<unknown>;
  load?(path: string): Promise<unknown>;
}

export class AssetLoader {
  private cache = new Map<string, unknown>();
  private queue: AssetDescriptor[] = [];

  constructor(private provider?: IAssetProvider) {}

  public setProvider(provider: IAssetProvider) {
    this.provider = provider;
  }

  public queueAssets(assets: AssetDescriptor[]) {
    this.queue.push(...assets);
  }

  public async load(assets: AssetDescriptor[]): Promise<void> {
    if (!this.provider) {
      console.warn("No AssetProvider set for AssetLoader");
      return;
    }

    const promises = assets.map(async asset => {
      if (this.cache.has(asset.id)) return;

      let loadedAsset: unknown;
      switch (asset.type) {
        case "image":
        case "texture":
          loadedAsset = await this.provider!.loadImage(asset.path);
          break;
        case "audio":
          loadedAsset = await this.provider!.loadAudio(asset.path);
          break;
        case "font":
          loadedAsset = await this.provider!.loadFont(asset.path);
          break;
        case "json":
          if (this.provider!.load) {
            loadedAsset = await this.provider!.load(asset.path);
          }
          break;
      }
      this.cache.set(asset.id, loadedAsset);
    });

    await Promise.all(promises);
  }

  public async loadAll(): Promise<void> {
    if (this.queue.length === 0) return;
    await this.load(this.queue);
    this.queue = [];
  }

  public get<T>(id: string): T {
    return this.cache.get(id) as T;
  }
}
