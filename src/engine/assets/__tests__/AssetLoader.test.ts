import { AssetLoader } from "../AssetLoader";
import { AssetDescriptor } from "../AssetTypes";

describe("AssetLoader", () => {
  let assetLoader: AssetLoader;

  beforeEach(() => {
    assetLoader = new AssetLoader();
  });

  it("should load queued assets", async () => {
    const assets: AssetDescriptor[] = [
      { id: "asset1", type: "texture", uri: "uri1" },
      { id: "asset2", type: "json", uri: "uri2" }
    ];

    assetLoader.queueAssets(assets);
    await assetLoader.loadAll();

    expect(assetLoader.isReady("asset1")).toBe(true);
    expect(assetLoader.isReady("asset2")).toBe(true);
    expect(assetLoader.get("asset1").data).toBe("uri1");
    expect(assetLoader.progress().percent).toBe(1);
  });

  it("should handle duplicate assets with reference counting", async () => {
    const desc: AssetDescriptor = { id: "shared", type: "texture", uri: "uri" };

    assetLoader.queueAssets([desc]);
    await assetLoader.loadAll();

    assetLoader.queueAssets([desc]);
    await assetLoader.loadAll();

    expect(assetLoader.isReady("shared")).toBe(true);

    assetLoader.unloadGroup(["shared"]);
    expect(assetLoader.isReady("shared")).toBe(true); // Still one ref left

    assetLoader.unloadGroup(["shared"]);
    expect(assetLoader.isReady("shared")).toBe(false); // All refs gone
  });

  it("should provide progress updates", async () => {
    const assets: AssetDescriptor[] = [
      { id: "a1", type: "texture", uri: "u1" },
      { id: "a2", type: "texture", uri: "u2" }
    ];

    assetLoader.queueAssets(assets);
    const promise = assetLoader.loadAll();

    expect(assetLoader.progress().total).toBe(2);
    await promise;
    expect(assetLoader.progress().loaded).toBe(2);
  });
});
