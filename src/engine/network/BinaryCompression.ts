import { Packr, unpack } from "msgpackr";

/**
 * Binary Serialization Engine - High-performance object encoding via MessagePack.
 *
 * @responsibility Transform JavaScript objects (snapshots/deltas) into compact binary buffers.
 * @responsibility Mitigate network bandwidth by reducing payload size.
 *
 * @remarks
 * TinyAsterEngine utilizes `msgpackr` for its high efficiency and native support for
 * modern JS types. Binary serialization reduces network packet size by 40% to 60%
 * compared to standard JSON strings.
 *
 * ### Serialization Strategy:
 * - **MessagePack**: Balanced performance/compression ratio (schema-less).
 * - **structuredClone: true**: Supports complex nested structures and prevents prototype pollution.
 * - **useRecords: false**: Disables record-style optimization to ensure maximum
 *   compatibility across different versions of the library and transport layers.
 *
 * @conceptualRisk [BINARY_COMPATIBILITY] State schema changes require synchronized
 * updates between client and server to prevent unpacking failures.
 * @conceptualRisk [CPU_OVERHEAD] Packing/unpacking adds a non-trivial CPU step
 * per network frame on low-end devices.
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
