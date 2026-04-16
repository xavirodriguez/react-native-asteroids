/**
 * @packageDocumentation
 * Core Asset and Handle Definitions.
 */

/** Supported asset categories. */
export type AssetType = 'texture' | 'audio' | 'json' | 'font';

/** Description of an asset to be loaded. */
export interface AssetDescriptor {
  /** Unique identifier used for retrieval. */
  id: string;
  /** The type of resource, influencing the loading strategy. */
  type: AssetType;
  /** URL or local path to the resource file. */
  uri: string;
  /** If true, the asset should be prioritized during initial load. */
  preload?: boolean;
}

/** Operational status of an asset within the loader. */
export type AssetStatus = 'loading' | 'ready' | 'error';

/**
 * A persistent handle to a resource, allowing status tracking
 * before the actual data is available.
 *
 * @template T - The expected type of the loaded resource data.
 */
export interface AssetHandle<T = unknown> {
  /** The original ID from the descriptor. */
  id: string;
  /** Current loading state. */
  status: AssetStatus;
  /** The loaded data. `null` if not yet ready or if an error occurred. */
  data: T | null;
  /** Error information if the loading failed. */
  error?: Error;
}
