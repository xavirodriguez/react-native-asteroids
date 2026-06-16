export interface AssetDescriptor {
  id: string;
  path: string;
  type: "image" | "audio" | "font";
}

export interface IAssetProvider {
  loadImage(path: string): Promise<any>;
  loadAudio(path: string): Promise<any>;
  loadFont(path: string): Promise<any>;
}

export class AssetLoader {
  private cache = new Map<string, any>();
  private provider?: IAssetProvider;

  constructor(provider?: IAssetProvider) {
    this.provider = provider;
  }

  public setProvider(provider: IAssetProvider) {
    this.provider = provider;
  }

  public async load(assets: AssetDescriptor[]): Promise<void> {
    if (!this.provider) {
      console.warn("No AssetProvider set for AssetLoader");
      return;
    }

    const promises = assets.map(async asset => {
      if (this.cache.has(asset.id)) return;

      let loadedAsset: any;
      switch (asset.type) {
        case "image":
          loadedAsset = await this.provider!.loadImage(asset.path);
          break;
        case "audio":
          loadedAsset = await this.provider!.loadAudio(asset.path);
          break;
        case "font":
          loadedAsset = await this.provider!.loadFont(asset.path);
          break;
      }
      this.cache.set(asset.id, loadedAsset);
    });

    await Promise.all(promises);
  }

  public get<T>(id: string): T {
    return this.cache.get(id) as T;
  }
}
