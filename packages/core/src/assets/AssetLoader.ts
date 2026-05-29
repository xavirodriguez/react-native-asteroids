import { AssetDescriptor, AssetHandle, IAssetProvider } from "./AssetProvider";

export class AssetLoader {
  private cache = new Map<string, AssetHandle<any>>();
  private provider: IAssetProvider;
  private refCounts = new Map<string, number>();

  constructor(provider: IAssetProvider) {
    this.provider = provider;
  }

  async load<T = unknown>(descriptor: AssetDescriptor): Promise<T> {
    this.incrementRef(descriptor.id);

    if (this.cache.has(descriptor.id)) {
      const handle = this.cache.get(descriptor.id)!;
      if (handle.status === "ready") return handle.data;
      if (handle.status === "loading") {
        // Wait for it
        while (this.cache.get(descriptor.id)?.status === "loading") {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        return this.cache.get(descriptor.id)!.data;
      }
    }

    const handle: AssetHandle<T> = {
      id: descriptor.id,
      status: "loading",
      data: null
    };
    this.cache.set(descriptor.id, handle);

    try {
      const data = await this.provider.load<T>(descriptor);
      handle.data = data;
      handle.status = "ready";
      return data;
    } catch (e) {
      handle.status = "error";
      handle.error = e as Error;
      throw e;
    }
  }

  get<T = unknown>(id: string): T | null {
    const handle = this.cache.get(id);
    return handle && handle.status === "ready" ? handle.data : null;
  }

  private incrementRef(id: string): void {
    this.refCounts.set(id, (this.refCounts.get(id) ?? 0) + 1);
  }

  unload(id: string): void {
    const count = this.refCounts.get(id) ?? 0;
    if (count <= 1) {
      const handle = this.cache.get(id);
      if (handle && this.provider.dispose) {
        this.provider.dispose(handle);
      }
      this.cache.delete(id);
      this.refCounts.delete(id);
    } else {
      this.refCounts.set(id, count - 1);
    }
  }
}
