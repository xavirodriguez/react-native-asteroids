import { Packr, unpack } from "msgpackr";

/**
 * Binary Serialization Engine - Object encoding via MessagePack.
 *
 * @remarks
 * TinyAsterEngine utilizes `msgpackr` with the goal of reducing payload size
 * compared to standard JSON strings.
 *
 * ### Serialization Strategy:
 * - **MessagePack**: Schema-less format with a balanced performance/compression ratio.
 * - **structuredClone: true**: Supports nested structures and seeks to prevent prototype pollution.
 * - **useRecords: false**: Disables record-style optimization to favor
 *   compatibility across different transport layers.
 *
 * @conceptualRisk [BINARY_COMPATIBILITY] Schema changes in components typically require
 * synchronized updates between client and server to prevent unpacking failures.
 * @conceptualRisk [CPU_OVERHEAD] Packing/unpacking incurs a CPU cost that may be
 * significant on low-end devices during high-frequency updates.
 */
export class BinaryCompression {
  private static packr = new Packr({
    structuredClone: true,
    useRecords: false,
  });

  /**
   * Packs a JS object into a binary Buffer.
   */
  public static pack(data: unknown): Uint8Array {
    return this.packr.pack(data);
  }

  /**
   * Unpacks binary data back into a JS object.
   */
  public static unpack<T>(data: Uint8Array): T {
    return unpack(data) as T;
  }
}
