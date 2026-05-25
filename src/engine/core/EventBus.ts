/**
 * Typed Event Bus for decoupled communication between systems and scenes.
 */
export type EventHandler<T = unknown> = (payload: T, event: string) => void;

/**
 * Messaging system designed for synchronous and deferred communication based on the Pub/Sub pattern.
 */
export class EventBus {
  private handlers = new Map<string, Set<EventHandler<unknown>>>();
  private deferredQueue: Array<{ event: string; payload?: unknown }> = [];
  private emitDepth = 0;
  private readonly MAX_RECURSION = 10;

  public on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler<unknown>);

    return () => this.off(event, handler);
  }

  public once<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    const onceHandler: EventHandler<T> = (payload, eventName) => {
      this.off(event, onceHandler);
      handler(payload, eventName);
    };
    return this.on(event, onceHandler);
  }

  public off<T = unknown>(event: string, handler: EventHandler<T>): void {
    const set = this.handlers.get(event);
    if (set) {
      set.delete(handler as EventHandler<unknown>);
    }
  }

  /**
   * Dispatches an event synchronously to all registered handlers.
   *
   * @remarks
   * **CAUTION**: Do NOT use this method within the simulation tick or physical
   * calculation phases if the event triggers side effects (like sound, UI updates,
   * or spawning). Use {@link EventBus.emitDeferred} instead to ensure side effects
   * are processed after the authoritative simulation state is finalized.
   */
  public emit<T = unknown>(event: string, payload?: T): void {
    if (this.emitDepth >= this.MAX_RECURSION) {
      console.warn(`EventBus: Maximum recursion depth (${this.MAX_RECURSION}) reached for event "${event}". Blocking further emission.`);
      return;
    }

    this.emitDepth++;
    try {
      this.notify(event, payload, event);
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
   * Queues an event to be processed after the current execution context (usually end-of-frame).
   *
   * @remarks
   * This is the **RECOMMENDED** method for simulation logic to signal semantic events
   * without causing reentrancy or side-effect contamination during deterministic ticks.
   */
  public emitDeferred<T = unknown>(event: string, payload?: T): void {
    this.deferredQueue.push({ event, payload });
  }

  /**
   * Processes all currently queued deferred events.
   *
   * @remarks
   * This should be called once per frame, typically at the very end of the engine
   * update cycle. It supports up to 5 iterations to handle events emitted during
   * the flush itself (cascading events).
   */
  public flushDeferred(): void {
    let iterations = 0;
    const MAX_ITERATIONS = 5;

    while (this.deferredQueue.length > 0 && iterations < MAX_ITERATIONS) {
      const queue = this.deferredQueue;
      this.deferredQueue = [];

      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        this.emit(item.event, item.payload);
      }
      iterations++;
    }

    if (iterations >= MAX_ITERATIONS && this.deferredQueue.length > 0) {
      console.warn("EventBus: Maximum deferred flush iterations reached. Some events were dropped to prevent infinite loops.");
      this.deferredQueue = [];
    }
  }


  public clear(pattern?: string): void {
    if (!pattern) {
      this.handlers.clear();
      this.deferredQueue = [];
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
      this.deferredQueue = this.deferredQueue.filter(item => !item.event.startsWith(prefix));
    } else {
      this.handlers.delete(pattern);
      this.deferredQueue = this.deferredQueue.filter(item => item.event !== pattern);
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
