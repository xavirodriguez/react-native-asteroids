export interface IAssetProvider {
  load(url: string): Promise<any>;
}
