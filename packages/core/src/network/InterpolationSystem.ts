/**
 * Visual smoothing system for remote entities.
 *
 * This module manages a buffer of historical snapshots received from the server.
 * It allows the client to calculate an interpolated visual position for an entity
 * by blending between two snapshots based on the current wall-clock time.
 *
 * @packageDocumentation
 */

import { EntitySnapshot } from "./NetTypes";

/**
 * Buffer que almacena y recupera snapshots para realizar interpolación basada en tiempo.
 *
 * @remarks
 * Previene el movimiento "entrecortado" (stuttering) causado por la latencia de red
 * y la baja frecuencia de actualización de los paquetes de estado.
 *
 * ### Lógica de Interpolación:
 * 1. **Buffer de Snapshots**: Mantiene un historial de los últimos estados recibidos (`snapshots`).
 * 2. **Búsqueda de Intervalo**: Encuentra los dos snapshots que rodean el tiempo objetivo (`targetTime`).
 * 3. **Cálculo de Alpha**: Determina un factor [0, 1] que representa cuánto tiempo ha pasado
 *    entre el snapshot previo y el siguiente.
 * 4. **Interpolación Lineal (Lerp)**: El llamador utiliza este alpha para mezclar posiciones.
 */
export class InterpolationBuffer {
  private snapshots: EntitySnapshot[] = [];
  private maxSize: number;

  /**
   * @param maxSize - Maximum number of snapshots to retain.
   */
  constructor(maxSize: number = 20) {
    this.maxSize = maxSize;
  }

  /**
   * Adds a new authoritative snapshot to the buffer.
   * Maintains the buffer sorted by timestamp to facilitate lookups.
   */
  public push(snapshot: EntitySnapshot): void {
    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSize) {
      this.snapshots.shift();
    }
    // Sort by timestamp to be safe
    this.snapshots.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Calculates interpolation data for a specific point in time.
   *
   * @remarks
   * Performs interval searching within the buffer to find snapshots `t_prev` and `t_next`
   * such that `t_prev <= targetTime <= t_next`.
   *
   * ### Alpha Calculation:
   * `alpha = (targetTime - t_prev) / (t_next - t_prev)`
   *
   * ### Extrapolation:
   * If `targetTime` exceeds the buffer's head, the system currently clamps to the latest
   * snapshot (`alpha = 1`). In high-jitter environments, this prevents erratic movement.
   *
   * @param targetTime - The wall-clock time (ms) to interpolate at.
   * @returns Snapshots and alpha factor, or null if insufficient data (< 2 snapshots).
   */
  public getAt(targetTime: number): { prev: EntitySnapshot; next: EntitySnapshot; alpha: number } | null {
    if (this.snapshots.length < 2) return null;

    // Find the two snapshots that bracket the target time
    for (let i = 0; i < this.snapshots.length - 1; i++) {
      const prev = this.snapshots[i];
      const next = this.snapshots[i + 1];

      if (targetTime >= prev.timestamp && targetTime <= next.timestamp) {
        const alpha = (targetTime - prev.timestamp) / (next.timestamp - prev.timestamp);
        return { prev, next, alpha };
      }
    }

    // Extrapolation (if targetTime is beyond our latest snapshot)
    const latest = this.snapshots[this.snapshots.length - 1];
    if (targetTime > latest.timestamp) {
       // Just return the latest for now, or implement extrapolation logic
       return { prev: latest, next: latest, alpha: 1 };
    }

    return null;
  }
}
