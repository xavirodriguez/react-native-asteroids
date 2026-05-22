export interface ServerTimeResponse {
  serverTime: number;
  weekSeed: string | number;
  weekIndex?: number;
  validFrom?: number;
  validUntil?: number;
}

/**
 * Servicio encargado de sincronizar el tiempo del cliente con el servidor.
 */
export class ServerTimeService {
  private static timeOffset: number = 0;
  private static lastSync: number = 0;
  private static metadata: ServerTimeResponse | null = null;
  private static syncInProgress: boolean = false;

  // En producción esto debería venir de una variable de entorno o config global
  private static readonly SERVER_BASE_URL = "http://localhost:2567";

  /**
   * Sincroniza el tiempo con el servidor.
   */
  public static async syncTime(): Promise<void> {
    if (this.syncInProgress) return;
    this.syncInProgress = true;

    try {
      const response = await fetch(`${this.SERVER_BASE_URL}/api/server-time`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data: ServerTimeResponse = await response.json();

      const now = Date.now();
      this.timeOffset = data.serverTime - now;
      this.metadata = data;
      this.lastSync = now;

      if (Math.abs(this.timeOffset) > 5 * 60 * 1000) {
        console.warn(`[TimeSync] Large clock drift detected: ${Math.round(this.timeOffset / 1000)}s. Please check your system clock.`);
      }
    } catch (error) {
      console.error("[TimeSync] Failed to sync time with server:", error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Devuelve el tiempo actual corregido según el offset del servidor.
   */
  public static getCorrectedTime(): number {
    return Date.now() + this.timeOffset;
  }

  /**
   * Devuelve la semilla semanal recibida del servidor.
   */
  public static getWeekSeed(): string | number | null {
    return this.metadata?.weekSeed ?? null;
  }

  /**
   * Devuelve los metadatos completos del servidor.
   */
  public static getMetadata(): ServerTimeResponse | null {
    return this.metadata;
  }

  /**
   * Devuelve el offset actual en milisegundos.
   */
  public static getTimeOffset(): number {
    return this.timeOffset;
  }

  /**
   * Indica si se ha realizado al menos una sincronización exitosa.
   */
  public static isSynced(): boolean {
    return this.lastSync > 0;
  }

  /**
   * Verifica si se puede iniciar una partida multiplayer (requiere sync).
   */
  public static canStartMultiplayer(): boolean {
    return this.isSynced() && this.metadata !== null;
  }

  /**
   * Devuelve true si el desfase es mayor a 5 minutos.
   */
  public static hasLargeDrift(): boolean {
    return Math.abs(this.timeOffset) > 5 * 60 * 1000;
  }
}
