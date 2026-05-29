import { AssetLoader } from "../AssetLoader";
import { IAssetProvider, AssetDescriptor } from "../AssetProvider";

class FakeProvider implements IAssetProvider {
  async load<T>(asset: AssetDescriptor): Promise<T> {
    return { loaded: asset.id } as any;
  }
}

describe("AssetLoader", () => {
  it("should load assets through a provider", async () => {
    const provider = new FakeProvider();
    const loader = new AssetLoader(provider);

    const asset = await loader.load({ id: "test", type: "texture" });
    expect(asset).toEqual({ loaded: "test" });
  });
});
