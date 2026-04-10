/**
 * Bus de eventos tipado para la comunicación desacoplada entre sistemas y escenas.
 * Implementa el patrón Pub/Sub con soporte para espacios de nombres y comodines (wildcards).
 *
 * @remarks
 * Los eventos pueden ser específicos (ej: `player:hit`) o genéricos mediante asterisco (ej: `player:*` o `*`).
 */
export type EventHandler<T = any> = (payload: T) => void;

/**
 * Gestor central de eventos del motor.
 *
 * @responsibility Registrar subscritores para eventos específicos o patrones.
 * @responsibility Despachar notificaciones de forma síncrona a todos los interesados.
 * @responsibility Gestionar el ciclo de vida de las subscripciones (on, once, off).
 *
 * @contract Subscripción: Un handler registrado con `once` se elimina automáticamente tras su ejecución.
 * @contract Notificación: Los handlers se ejecutan en bloques `try-catch` individuales para evitar
 * que un fallo en un listener rompa la cadena de ejecución.
 *
 * @conceptualRisk [ORDER][MEDIUM] El orden de ejecución de los handlers para un mismo evento
 * no está garantizado. No se debe depender del orden de registro.
 * @conceptualRisk [RECURSION][LOW] No hay protección contra bucles infinitos de eventos
 * (ej: Evento A dispara Evento B, que dispara de nuevo Evento A).
 */
export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  /**
   * Subscribes to an event.
   * @param event The event name or pattern (e.g., "game:score_changed", "entity:*")
   * @param handler The callback function
   */
  public on<T = any>(event: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  /**
   * Subscribes to an event once.
   */
  public once<T = any>(event: string, handler: EventHandler<T>): void {
    const onceHandler: EventHandler<T> = (payload) => {
      this.off(event, onceHandler);
      handler(payload);
    };
    this.on(event, onceHandler);
  }

  /**
   * Unsubscribes from an event.
   */
  public off<T = any>(event: string, handler: EventHandler<T>): void {
    const set = this.handlers.get(event);
    if (set) {
      set.delete(handler);
    }
  }

  /**
   * Emits an event with a payload.
   * Notifies exact match listeners and matching wildcard listeners.
   */
  public emit<T = any>(event: string, payload: T): void {
    // Notify exact matches
    this.notify(event, payload);

    // Notify wildcards (e.g., "game:*" matches "game:start")
    if (event.includes(":")) {
      const namespace = event.split(":")[0];
      this.notify(`${namespace}:*`, payload);
    }
    this.notify("*", payload);
  }

  /**
   * Clears handlers matching a pattern or all if none provided.
   */
  public clear(pattern?: string): void {
    if (!pattern) {
      this.handlers.clear();
      return;
    }

    if (pattern.endsWith("*")) {
      const prefix = pattern.slice(0, -1);
      const keys = Array.from(this.handlers.keys());
      for (const event of keys) {
        if (event.startsWith(prefix)) {
          this.handlers.delete(event);
        }
      }
    } else {
      this.handlers.delete(pattern);
    }
  }

  private notify(event: string, payload: any): void {
    const set = this.handlers.get(event);
    if (set) {
      set.forEach(handler => {
        try {
          handler(payload);
        } catch (e) {
          console.error(`Error in EventBus handler for event "${event}":`, e);
        }
      });
    }
  }
}
