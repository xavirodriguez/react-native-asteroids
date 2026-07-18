/** @public */
export type EventRegistry = Record<string, unknown>;

/** @public */
export interface CoreEvents {
  "engine:paused": { tick: number; timestamp: number };
  "engine:resumed": { tick: number; timestamp: number };
  "engine:destroyed": { timestamp: number };
}

/** @public */
export type CombinedEvents<TEvents extends EventRegistry> = CoreEvents & TEvents;

/** @public */
export type EventHandler<TPayload> = (payload: TPayload, event: string) => void;

/**
 * A central event bus for decoupling world events from system logic.
 *
 * @remarks
 * Supports both immediate (`emit`) and deferred (`emitDeferred`) execution.
 * Deferred events are processed when `flushDeferred` is called, typically at
 * the end of a simulation step.
 *
 * Note: Handlers are generally executed in the order they were registered.
 * While the bus itself is synchronous, handlers may trigger side effects
 * (including asynchronous ones) that are not managed, tracked, or awaited by the bus.
 *
 * @typeParam TEvents - The registry of custom events for this bus.
 * @public
 */
export class EventBus<TEvents extends EventRegistry = EventRegistry> {
  private handlers = new Map<string, Set<EventHandler<unknown>>>();
  private primaryBuffer: { event: string; payload: unknown }[] = [];
  private secondaryBuffer: { event: string; payload: unknown }[] = [];
  private isProcessing = false;
  private maxRecursion: number;
  private recursionDepth = 0;

  /**
   * Public trace stack representing the path of nested synchronously emitted events.
   */
  public currentEventChain: string[] = [];

  constructor(config?: { maxRecursion?: number }) {
    this.maxRecursion = config?.maxRecursion ?? 10;
  }

  /**
   * Subscribes a handler to an event.
   *
   * @returns A function to unsubscribe the handler.
   */
  on<K extends keyof CombinedEvents<TEvents> & string>(
    event: K,
    handler: EventHandler<CombinedEvents<TEvents>[K]>
  ): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler<unknown>);
    return () => this.off(event, handler);
  }

  once<K extends keyof CombinedEvents<TEvents> & string>(
    event: K,
    handler: EventHandler<CombinedEvents<TEvents>[K]>
  ): () => void {
    const wrapper: EventHandler<CombinedEvents<TEvents>[K]> = (payload, e) => {
      this.off(event, wrapper);
      handler(payload, e);
    };
    return this.on(event, wrapper);
  }

  off<K extends keyof CombinedEvents<TEvents> & string>(
    event: K,
    handler: EventHandler<CombinedEvents<TEvents>[K]>
  ): void {
    this.handlers.get(event)?.delete(handler as EventHandler<unknown>);
  }

  /**
   * Synchronously notifies all handlers of an event.
   *
   * @remarks
   * This method triggers immediate execution of all registered handlers for the event.
   *
   * @warning
   * Immediate `emit` can lead to deeply nested call stacks and side effects that are
   * difficult to trace. Recursion is limited to a maximum depth (default 10) to
   * help prevent infinite loops. For cross-system communication during the update loop,
   * `emitDeferred` is recommended to help maintain simulation predictability.
   */
  emit<K extends keyof CombinedEvents<TEvents> & string>(
    event: K,
    payload: CombinedEvents<TEvents>[K]
  ): void {
    this.recursionDepth++;
    if (this.recursionDepth > this.maxRecursion) {
      console.warn(`EventBus: Max recursion depth reached for event ${event}`);
      this.recursionDepth--;
      return;
    }

    this.currentEventChain.push(event);

    try {
      const handlers = this.handlers.get(event);
      if (handlers) {
        const handlersCopy = Array.from(handlers);
        for (const handler of handlersCopy) {
          try {
            handler(payload, event);
          } catch (e) {
            console.error(`Error in event handler for ${event}:`, e);
          }
        }
      }
    } finally {
      this.currentEventChain.pop();
      this.recursionDepth--;
    }
  }

  /**
   * Queues an event to be processed later during {@link EventBus.flushDeferred}.
   */
  emitDeferred<K extends keyof CombinedEvents<TEvents> & string>(
    event: K,
    payload: CombinedEvents<TEvents>[K]
  ): void {
    this.primaryBuffer.push({ event, payload });
  }

  /**
   * Executes all deferred events.
   */
  flushDeferred(): void {
    if (this.isProcessing) return;
    this.isProcessing = true;
    try {
      [this.primaryBuffer, this.secondaryBuffer] = [this.secondaryBuffer, this.primaryBuffer];
      for (let i = 0; i < this.secondaryBuffer.length; i++) {
        const { event, payload } = this.secondaryBuffer[i];
        this.emit(event as keyof CombinedEvents<TEvents> & string, payload as CombinedEvents<TEvents>[keyof CombinedEvents<TEvents> & string]);
      }
    } finally {
      this.secondaryBuffer.length = 0;
      this.isProcessing = false;
    }
  }

  clear(pattern?: string): void {
    if (!pattern) {
      this.handlers.clear();
    } else {
      const regex = new RegExp(pattern);
      for (const key of this.handlers.keys()) {
        if (regex.test(key)) {
          this.handlers.delete(key);
        }
      }
    }
    this.primaryBuffer.length = 0;
    this.secondaryBuffer.length = 0;
  }
}
