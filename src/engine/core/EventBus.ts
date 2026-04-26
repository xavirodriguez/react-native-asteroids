/**
 * Bus de eventos tipado para la comunicación desacoplada entre sistemas y escenas.
 * Implementa el patrón Pub/Sub con soporte para espacios de nombres y comodines (wildcards).
 *
 * @remarks
 * Los eventos pueden ser específicos (ej: `player:hit`) o genéricos mediante asterisco (ej: `player:*` o `*`).
 */
export type EventHandler<T = unknown> = (payload: T, event: string) => void;

/**
 * Sistema de mensajería diseñado para la comunicación síncrona basada en el patrón Pub/Sub.
 *
 * @remarks
 * El EventBus facilita el desacoplamiento entre sistemas. Soporta nombres de eventos
 * jerárquicos y comodines.
 *
 * @responsibility Despachar notificaciones a los subscriptores registrados.
 * @responsibility Aislar errores de listeners individuales mediante bloques try-catch.
 *
 * @conceptualRisk [ORDER][MEDIUM] El orden de ejecución de los handlers para un mismo evento
 * no está garantizado y no se debe depender del orden de registro.
 * @conceptualRisk [RECURSION][LOW] No hay protección contra bucles infinitos de eventos
 * (ej: Evento A dispara Evento B, que dispara de nuevo Evento A).
 */
export class EventBus {
  private handlers = new Map<string, Set<EventHandler<unknown>>>();
  private emitDepth = 0;
  private readonly MAX_RECURSION = 10;

  /**
   * Suscribe un controlador a un evento específico o patrón.
   *
   * @param event - Nombre del evento o patrón (ej: "game:score_changed", "entity:*").
   * @param handler - Función callback que recibirá los datos del evento.
   *
   * @postcondition El handler se añadirá al conjunto de subscriptores del evento.
   */
  public on<T = unknown>(event: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler<unknown>);
  }

  /**
   * Suscribe un controlador que se ejecutará una sola vez.
   *
   * @param event - Nombre del evento.
   * @param handler - Función callback.
   *
   * @postcondition Se intenta eliminar el handler automáticamente tras la primera ejecución exitosa.
   */
  public once<T = unknown>(event: string, handler: EventHandler<T>): void {
    const onceHandler: EventHandler<T> = (payload, eventName) => {
      this.off(event, onceHandler);
      handler(payload, eventName);
    };
    this.on(event, onceHandler);
  }

  /**
   * Unsubscribes from an event.
   */
  public off<T = unknown>(event: string, handler: EventHandler<T>): void {
    const set = this.handlers.get(event);
    if (set) {
      set.delete(handler as EventHandler<unknown>);
    }
  }

  /**
   * Emite un evento y notifica a los subscriptores que coincidan con el nombre o patrón.
   *
   * @remarks
   * La notificación se realiza de forma síncrona. Primero se notifican los subscriptores exactos,
   * luego los de espacio de nombres (ej: "game:*") y finalmente el comodín global ("*").
   *
   * @param event - Nombre del evento.
   * @param payload - Datos asociados al evento.
   */
  public emit<T = unknown>(event: string, payload?: T): void {
    if (this.emitDepth >= this.MAX_RECURSION) {
      console.warn(`EventBus: Maximum recursion depth (${this.MAX_RECURSION}) reached for event "${event}". Blocking further emission.`);
      return;
    }

    this.emitDepth++;
    try {
      // Notify exact matches
      this.notify(event, payload, event);

      // Notify wildcards (e.g., "game:*" matches "game:start")
      if (event.includes(":")) {
        const namespace = event.split(":")[0];
        this.notify(`${namespace}:*`, payload, event);
      }
      this.notify("*", payload, event);
    } finally {
      this.emitDepth--;
    }
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

  private notify(subscriptionKey: string, payload: unknown, originalEvent: string): void {
    const set = this.handlers.get(subscriptionKey);
    if (set) {
      set.forEach(handler => {
        try {
          handler(payload, originalEvent);
        } catch (e) {
          console.error(`Error in EventBus handler for event "${originalEvent}" (subscribed as "${subscriptionKey}"):`, e);
        }
      });
    }
  }
}
