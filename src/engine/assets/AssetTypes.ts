/**
 * Categories of supported engine assets.
 *
 * @public
 */
export type AssetType = 'texture' | 'audio' | 'json' | 'font';

/**
 * Metadata for enqueuing an asset.
 *
 * @public
 */
export interface AssetDescriptor {
  /** Unique identifier for the asset. */
  id: string;
  type: AssetType;
  /** Physical path or URI. */
  uri: string;
  /** If true, the loader prioritizes this asset. */
  preload?: boolean;
}

/**
 * Operational status of an asset handle.
 *
 * @public
 */
export type AssetStatus = 'loading' | 'ready' | 'error';

/**
 * Reactive handle for tracking and accessing a loaded asset.
 *
 * @public
 */
export interface AssetHandle<T = unknown> {
  id: string;
  status: AssetStatus;
  /** The loaded data. Null until status is 'ready'. */
  data: T | null;
  /** Error details if status is 'error'. */
  error?: Error;
}
