"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerTimeService = void 0;
/**
 * Servicio encargado de sincronizar el tiempo del cliente con el servidor.
 *
 * @remarks
 * Proporciona una estimación del tiempo del servidor calculando el desfase (offset)
 * entre el reloj local y el remoto. La precisión de `getCorrectedTime()` depende de
 * la latencia de la red y la estabilidad del reloj del sistema.
 */
class ServerTimeService {
    static timeOffset = 0;
    static lastSync = 0;
    static metadata = null;
    static syncInProgress = false;
    // En producción esto debería venir de una variable de entorno o config global
    static SERVER_BASE_URL = "http://localhost:2567";
    /**
     * Sincroniza el tiempo con el servidor.
     */
    static async syncTime() {
        if (this.syncInProgress)
            return;
        this.syncInProgress = true;
        try {
            const response = await fetch(`${this.SERVER_BASE_URL}/api/server-time`);
            if (!response.ok)
                throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            const now = Date.now();
            this.timeOffset = data.serverTime - now;
            this.metadata = data;
            this.lastSync = now;
            if (Math.abs(this.timeOffset) > 5 * 60 * 1000) {
                console.warn(`[TimeSync] Large clock drift detected: ${Math.round(this.timeOffset / 1000)}s. Please check your system clock.`);
            }
        }
        catch (error) {
            console.error("[TimeSync] Failed to sync time with server:", error);
        }
        finally {
            this.syncInProgress = false;
        }
    }
    /**
     * Devuelve el tiempo actual corregido según el offset del servidor.
     */
    static getCorrectedTime() {
        return Date.now() + this.timeOffset;
    }
    /**
     * Devuelve la semilla semanal recibida del servidor.
     */
    static getWeekSeed() {
        return this.metadata?.weekSeed ?? null;
    }
    /**
     * Devuelve los metadatos completos del servidor.
     */
    static getMetadata() {
        return this.metadata;
    }
    /**
     * Devuelve el offset actual en milisegundos.
     */
    static getTimeOffset() {
        return this.timeOffset;
    }
    /**
     * Indica si se ha realizado al menos una sincronización exitosa.
     */
    static isSynced() {
        return this.lastSync > 0;
    }
    /**
     * Verifica si se puede iniciar una partida multiplayer (requiere sync).
     */
    static canStartMultiplayer() {
        return this.isSynced() && this.metadata !== null;
    }
    /**
     * Devuelve true si el desfase es mayor a 5 minutos.
     */
    static hasLargeDrift() {
        return Math.abs(this.timeOffset) > 5 * 60 * 1000;
    }
}
exports.ServerTimeService = ServerTimeService;
