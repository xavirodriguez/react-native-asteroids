import { IAssetProvider } from "@tiny-aster/core";
import { Asset } from "expo-asset";
import * as Font from "expo-font";

export class ExpoAssetProvider implements IAssetProvider {
  public async loadImage(path: string): Promise<any> {
    const asset = Asset.fromModule(path);
    await asset.downloadAsync();
    return asset;
  }
  public async loadAudio(path: string): Promise<any> {
    const asset = Asset.fromModule(path);
    await asset.downloadAsync();
    return asset;
  }
  public async loadFont(path: string): Promise<any> {
    await Font.loadAsync({ [path]: path });
    return path;
  }
  public async load(path: string): Promise<any> {
    const asset = Asset.fromModule(path);
    await asset.downloadAsync();
    return asset;
  }
}
