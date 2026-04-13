/**
 * Bus de eventos tipado para la comunicación desacoplada entre sistemas y escenas.
 * Implementa el patrón Pub/Sub con soporte para espacios de nombres y comodines (wildcards).
 *
 * @remarks
 * Los eventos pueden ser específicos (ej: `player:hit`) o genéricos mediante asterisco (ej: `player:*` o `*`).
 */
export type EventHandler<T = any> = (payload: T) => void;
/**
 * Sistema de mensajería síncrona basado en el patrón Pub/Sub.
 *
 * @remarks
 * El EventBus facilita el desacoplamiento entre sistemas que no necesitan conocerse
 * directamente. Soporta nombres de eventos jerárquicos y comodines.
 *
 * @responsibility Despachar notificaciones síncronas a subscriptores registrados.
 * @responsibility Aislar errores de listeners individuales mediante bloques try-catch.
 *
 * @conceptualRisk [ORDER][MEDIUM] El orden de ejecución de los handlers para un mismo evento
 * no está garantizado. No se debe depender del orden de registro.
 * @conceptualRisk [RECURSION][LOW] No hay protección contra bucles infinitos de eventos
 * (ej: Evento A dispara Evento B, que dispara de nuevo Evento A).
 */
export declare class EventBus {
    private handlers;
    /**
     * Subscribes to an event.
     * @param event The event name or pattern (e.g., "game:score_changed", "entity:*")
     * @param handler The callback function
     */
    on<T = any>(event: string, handler: EventHandler<T>): void;
    /**
     * Subscribes to an event once.
     */
    once<T = any>(event: string, handler: EventHandler<T>): void;
    /**
     * Unsubscribes from an event.
     */
    off<T = any>(event: string, handler: EventHandler<T>): void;
    /**
     * Emite un evento y notifica a todos los subscriptores relevantes.
     *
     * @remarks
     * La notificación es síncrona. Primero se notifican los subscriptores exactos,
     * luego los de espacio de nombres (ej: "game:*") y finalmente el comodín global ("*").
     *
     * @param event - Nombre del evento.
     * @param payload - Datos asociados al evento.
     */
    emit<T = any>(event: string, payload: T): void;
    /**
     * Clears handlers matching a pattern or all if none provided.
     */
    clear(pattern?: string): void;
    private notify;
}
