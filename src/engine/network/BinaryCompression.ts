import { Packr, unpack } from "msgpackr";

/**
 * Utility for high-performance binary serialization.
 *
 * Uses MessagePack (via `msgpackr`) to convert complex JavaScript objects
 * into compact `Uint8Array` payloads for network transmission.
 *
 * @responsibility Handle binary serialization of network packets using MessagePack.
 * @remarks
 * ### Serialization Strategy
 * - **MessagePack**: Chosen for its balance between performance and compression ratio
 *   compared to Protobuf (no schema required) or JSON (text-based).
 * - **structuredClone**: Enabled to support complex data types and circular references
 *   within the object tree.
 * - **useRecords: false**: Disables record-style optimization to ensure maximum
 *   compatibility across different versions of the packr library and clients.
 */
export class BinaryCompression {
  private static packr = new Packr({
    structuredClone: true,
    useRecords: false,
  });

  /**
   * Packs a JS object into a binary Buffer.
   */
  public static pack(data: any): Uint8Array {
    return this.packr.pack(data);
  }

  /**
   * Unpacks binary data back into a JS object.
   */
  public static unpack<T>(data: Uint8Array): T {
    return unpack(data) as T;
  }
}
