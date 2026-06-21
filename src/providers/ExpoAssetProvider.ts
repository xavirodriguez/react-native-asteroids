import { Asset } from "expo-asset";
import * as Font from "expo-font";
import { IAssetProvider } from "@tiny-aster/core";

/**
 * Expo-specific implementation of the IAssetProvider interface.
 * Bridges the agnostic core with native Expo asset loading.
 */
export class ExpoAssetProvider implements IAssetProvider {
  /**
   * Loads an image/texture asset using Expo Asset.
   */
  async loadImage(path: string): Promise<Asset> {
    const asset = Asset.fromModule(path);
    await asset.downloadAsync();
    return asset;
  }

  /**
   * Loads an audio asset using Expo Asset.
   */
  async loadAudio(path: string): Promise<Asset> {
    const asset = Asset.fromModule(path);
    await asset.downloadAsync();
    return asset;
  }

  /**
   * Loads a font asset using Expo Font.
   */
  async loadFont(path: string): Promise<void> {
    // Note: Expo Font.loadAsync takes an object of { [name]: source }
    // or we can just load it if it's a remote URL or a module.
    // Here we assume path might be a module reference or name
    if (typeof path === 'string' && (path.startsWith('http') || path.includes('/'))) {
         await Font.loadAsync({ [path.split('/').pop()?.split('.')[0] || 'font']: path });
    } else {
        // Fallback for asset modules if path is passed as require() result
        await Font.loadAsync(path as any);
    }
  }

  /**
   * Generic loader for other asset types (e.g. JSON).
   */
  async load(path: string): Promise<any> {
    const asset = Asset.fromModule(path);
    await asset.downloadAsync();
    return asset;
  }
}
