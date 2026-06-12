import type { Packr as PackrType } from "msgpackr";

let Packr: any;
let unpack: any;

try {
  // Use require for CommonJS/Jest environment
  const msgpackr = require("msgpackr/dist/node.cjs");
  Packr = msgpackr.Packr;
  unpack = msgpackr.unpack;
} catch {
  // If require fails (ESM environment), we will rely on tsup's bundling or standard imports
  // In ESM, the tsup build will correctly handle 'import { Packr, unpack } from "msgpackr"'
}

/**
 * Binary Serialization Engine - Object encoding via MessagePack.
 */
export class BinaryCompression {
  private static packr: PackrType;

  private static getPackr(): PackrType {
    if (!this.packr && Packr) {
      this.packr = new Packr({
        structuredClone: true,
        useRecords: false,
      });
    }
    return this.packr;
  }

  /**
   * Encodes an object into a binary Buffer.
   */
  public static encode(data: unknown): Uint8Array {
    const packr = this.getPackr();
    if (!packr) return new Uint8Array();
    return packr.pack(data);
  }

  /**
   * Decodes a binary Buffer back into an object.
   */
  public static decode<T>(data: Uint8Array): T {
    if (unpack) {
        return unpack(data) as T;
    }
    return {} as T;
  }

  /**
   * Calculates the approximate byte size of a serialized object.
   */
  public static getByteSize(data: unknown): number {
    return this.encode(data).length;
  }
}
