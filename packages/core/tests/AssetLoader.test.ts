import { AssetLoader, IAssetProvider } from "../src/assets/AssetLoader";

class FakeAssetProvider implements IAssetProvider {
  loadImage = jest.fn().mockResolvedValue("image_data");
  loadAudio = jest.fn().mockResolvedValue("audio_data");
  loadFont = jest.fn().mockResolvedValue("font_data");
}

describe("AssetLoader validation", () => {
  let loader: AssetLoader;
  let provider: FakeAssetProvider;

  beforeEach(() => {
    provider = new FakeAssetProvider();
    loader = new AssetLoader(provider);
  });

  it("should successfully queue and load valid assets", async () => {
    const assets = [
      { id: "test_img", path: "test/img.png", type: "image" as const },
      { id: "test_snd", path: "test/sound.mp3", type: "audio" as const }
    ];

    loader.queueAssets(assets);
    await loader.loadAll();

    expect(provider.loadImage).toHaveBeenCalledWith("test/img.png");
    expect(provider.loadAudio).toHaveBeenCalledWith("test/sound.mp3");
    expect(loader.get("test_img")).toBe("image_data");
  });

  it("should throw validation error on invalid asset queueing", () => {
    const invalidAssets = [
      { id: "test_img", path: "test/img.png", type: "invalid_type" as unknown as "image" }
    ];

    expect(() => {
      loader.queueAssets(invalidAssets);
    }).toThrow();
  });

  it("should throw validation error on loading invalid assets directly", async () => {
    const invalidAssets = [
      { id: "test_img", path: "test/img.png", type: "invalid_type" as unknown as "image" }
    ];

    await expect(loader.load(invalidAssets)).rejects.toThrow();
  });
});
