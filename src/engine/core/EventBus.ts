/**
 * Bus de eventos tipado para la comunicación desacoplada entre sistemas y escenas.
 * Implementa el patrón Pub/Sub con soporte para espacios de nombres y comodines (wildcards).
 *
 * @remarks
 * Los eventos pueden ser específicos (ej: `player:hit`) o genéricos mediante asterisco (ej: `player:*` o `*`).
 */
export type EventHandler<T = unknown> = (payload: T) => void;

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
export class EventBus {
  private handlers = new Map<string, Set<EventHandler<unknown>>>();
  private deferredQueue: Array<{ event: string; payload: unknown }> = [];
  private processingQueue: Array<{ event: string; payload: unknown }> = [];
  private pool: Array<{ event: string; payload: unknown }> = [];

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
   * @postcondition El handler se eliminará automáticamente tras la primera ejecución exitosa.
   */
  public once<T = unknown>(event: string, handler: EventHandler<T>): void {
    const onceHandler: EventHandler<T> = (payload) => {
      this.off(event, onceHandler);
      handler(payload);
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
   * Emite un evento y notifica a todos los subscriptores relevantes.
   *
   * @remarks
   * La notificación es síncrona. Primero se notifican los subscriptores exactos,
   * luego los de espacio de nombres (ej: "game:*") y finalmente el comodín global ("*").
   *
   * @param event - Nombre del evento.
   * @param payload - Datos asociados al evento.
   */
  public emit<T = unknown>(event: string, payload?: T): void {
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
   * Encola un evento para ser procesado de forma diferida.
   *
   * @remarks
   * Utiliza un pool de objetos interno para cumplir con la restricción de Zero-GC.
   * Los eventos encolados se procesarán cuando se llame a {@link EventBus.processDeferred}.
   *
   * @param event - Nombre del evento.
   * @param payload - Datos asociados al evento.
   */
  public emitDeferred<T = unknown>(event: string, payload?: T): void {
    let entry = this.pool.pop();
    if (!entry) {
      entry = { event: "", payload: undefined };
    }
    entry.event = event;
    entry.payload = payload;
    this.deferredQueue.push(entry);
  }

  /**
   * Procesa todos los eventos encolados mediante {@link EventBus.emitDeferred}.
   *
   * @remarks
   * Intercambia las colas internamente para permitir que nuevos eventos diferidos
   * generados durante el procesamiento se encolen para el siguiente ciclo,
   * previniendo recursividad infinita y bloqueos de ejecución.
   */
  public processDeferred(): void {
    if (this.deferredQueue.length === 0) return;

    // Swap queues to safely process current events
    const temp = this.processingQueue;
    this.processingQueue = this.deferredQueue;
    this.deferredQueue = temp;

    for (let i = 0; i < this.processingQueue.length; i++) {
      const item = this.processingQueue[i];
      this.emit(item.event, item.payload);

      // Return object to pool
      item.event = "";
      item.payload = undefined;
      this.pool.push(item);
    }

    this.processingQueue.length = 0;
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

  private notify(event: string, payload: unknown): void {
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
