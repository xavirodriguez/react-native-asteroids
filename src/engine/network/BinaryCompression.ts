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
 * Utilidad de compresión y serialización binaria basada en MessagePack.
 *
 * @responsibility Transformar objetos JavaScript (snapshots/deltas) en buffers binarios compactos.
 *
 * @remarks
 * TinyAsterEngine utiliza `msgpackr` por su alta eficiencia y soporte nativo para
 * extensiones de tipos (como Maps/Sets). La serialización binaria reduce el tamaño
 * de los paquetes de red entre un 40% y 60% en comparación con JSON estándar.
 *
 * @conceptualRisk [BINARY_COMPATIBILITY] Los cambios en la estructura de los esquemas
 * (GameState) requieren que tanto el cliente como el servidor se actualicen simultáneamente
 * para evitar fallos de desempaquetado.
 * @conceptualRisk [OVERHEAD] Aunque el tamaño del paquete es menor, la CPU debe realizar
 * el paso extra de empaquetado/desempaquetado.
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
