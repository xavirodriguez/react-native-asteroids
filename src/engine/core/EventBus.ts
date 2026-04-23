/**
 * Bus de eventos tipado para la comunicación desacoplada entre sistemas y escenas.
 * Implementa el patrón Pub/Sub con soporte para espacios de nombres y comodines (wildcards).
 *
 * @remarks
 * Los eventos pueden ser específicos (ej: `player:hit`) o genéricos mediante asterisco (ej: `player:*` o `*`).
 */
export type EventHandler<T = unknown> = (payload: T) => void;

interface DeferredEvent {
  event: string;
  payload: unknown;
}

/**
 * Sistema de mensajería diseñado para la comunicación síncrona y diferida basada en el patrón Pub/Sub.
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
  private deferredQueue: DeferredEvent[] = [];
  private eventPool: DeferredEvent[] = [];
  private processingQueue: DeferredEvent[] = [];

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
   * Encola un evento para ser procesado de forma diferida mediante {@link processDeferred}.
   * Diseñado para evitar "Event Storms" y recursividad infinita en el frame actual.
   *
   * @param event - Nombre del evento.
   * @param payload - Datos asociados.
   */
  public emitDeferred<T = unknown>(event: string, payload?: T): void {
    const deferred = this.eventPool.pop() || { event: "", payload: null };
    deferred.event = event;
    deferred.payload = payload;
    this.deferredQueue.push(deferred);
  }

  /**
   * Procesa todos los eventos encolados de forma diferida.
   * Se recomienda llamar a este método al inicio de cada frame.
   *
   * @remarks
   * Implementa una estrategia Zero-GC reutilizando objetos de evento mediante un pool interno.
   */
  public processDeferred(): void {
    if (this.deferredQueue.length === 0) return;

    // Swap queues to allow emitDeferred during processing
    const temp = this.processingQueue;
    this.processingQueue = this.deferredQueue;
    this.deferredQueue = temp;

    for (let i = 0; i < this.processingQueue.length; i++) {
      const { event, payload } = this.processingQueue[i];
      this.emit(event, payload);

      // Clean and return to pool
      this.processingQueue[i].event = "";
      this.processingQueue[i].payload = null;
      this.eventPool.push(this.processingQueue[i]);
    }

    this.processingQueue.length = 0;
  }

  /**
   * Clears handlers matching a pattern or all if none provided.
   */
  public clear(pattern?: string): void {
    if (!pattern) {
      this.handlers.clear();
      this.deferredQueue.length = 0;
      this.processingQueue.length = 0;
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
