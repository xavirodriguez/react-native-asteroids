import { IAssetProvider } from "./AssetProvider";

export interface AssetDescriptor {
  id: string;
  type: "texture" | "audio" | "json";
  module?: any;
  url?: string;
}

export class AssetLoader {
  private assets = new Map<string, any>();
  private queue: AssetDescriptor[] = [];

  constructor(private provider?: IAssetProvider) {}

  queueAssets(assets: AssetDescriptor[]) {
    this.queue.push(...assets);
  }

  async loadAll(): Promise<void> {
    const promises = this.queue.map(async (asset) => {
      let data: any;
      if (asset.module) {
        data = asset.module;
      } else if (asset.url && this.provider) {
        data = await this.provider.load(asset.url);
      }
      if (data) {
        this.assets.set(asset.id, data);
      }
    });
    await Promise.all(promises);
    this.queue = [];
  }

  get<T>(id: string): T {
    return this.assets.get(id);
  }
}
