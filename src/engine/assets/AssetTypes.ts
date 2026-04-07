export type AssetType = 'texture' | 'audio' | 'json' | 'font';

export interface AssetDescriptor {
  id: string;
  type: AssetType;
  uri: string;
  preload?: boolean;
}

export type AssetStatus = 'loading' | 'ready' | 'error';

export interface AssetHandle<T = any> {
  id: string;
  status: AssetStatus;
  data: T | null;
  error?: Error;
}
