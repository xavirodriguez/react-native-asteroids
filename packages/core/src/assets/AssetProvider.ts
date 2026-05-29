export type AssetType = "texture" | "audio" | "json" | "font";

export interface AssetDescriptor {
  id: string;
  type: AssetType;
  uri?: string;
  module?: unknown;
  preload?: boolean;
}

export type AssetStatus = "loading" | "ready" | "error";

export interface AssetHandle<T = unknown> {
  id: string;
  status: AssetStatus;
  data: T | null;
  error?: Error;
}

export interface IAssetProvider {
  load<T = unknown>(asset: AssetDescriptor): Promise<T>;
  dispose?(asset: AssetHandle<unknown>): void | Promise<void>;
}
