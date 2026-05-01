import { Packr, unpack } from "msgpackr";

/**
 * @responsibility Handle binary serialization of network packets using MessagePack.
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
