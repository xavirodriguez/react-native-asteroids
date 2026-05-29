/**
 * Registry of all events available in the system.
 */
export type EventRegistry = Record<string, unknown>;

/**
 * Core events emitted by the engine.
 */
export interface CoreEvents {
  "engine:paused": { tick: number; timestamp: number };
  "engine:resumed": { tick: number; timestamp: number };
  "engine:destroyed": { timestamp: number };
}

/**
 * Combined registry of core events and user-defined events.
 */
export type CombinedEvents<TEvents extends EventRegistry> =
  CoreEvents & TEvents;

/**
 * Typed Event Bus for decoupled communication between systems and scenes.
 */
export type EventHandler<TPayload> = (payload: TPayload, event: string) => void;

/**
 * Messaging system designed for synchronous and deferred communication based on the Pub/Sub pattern.
  *
  * @remarks
  * The EventBus is intended to facilitate decoupled communication. While it supports
  * synchronous emission, using {@link EventBus.emitDeferred} is recommended within
  * simulation logic to help isolate side effects and maintain simulation integrity.
 */
export class EventBus<TEvents extends EventRegistry = EventRegistry> {
  private handlers = new Map<string, Set<EventHandler<any>>>();
  private deferredQueue: Array<{ event: string; payload?: any }> = [];
  private emitDepth = 0;
  private readonly MAX_RECURSION = 10;

  public on<K extends keyof CombinedEvents<TEvents> & string>(
    event: K,
    handler: EventHandler<CombinedEvents<TEvents>[K]>
  ): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler<any>);

    return () => this.off(event, handler);
  }

  public once<K extends keyof CombinedEvents<TEvents> & string>(
    event: K,
    handler: EventHandler<CombinedEvents<TEvents>[K]>
  ): () => void {
    const onceHandler: EventHandler<CombinedEvents<TEvents>[K]> = (payload, eventName) => {
      this.off(event, onceHandler);
      handler(payload, eventName);
    };
    return this.on(event, onceHandler);
  }

  public off<K extends keyof CombinedEvents<TEvents> & string>(
    event: K,
    handler: EventHandler<CombinedEvents<TEvents>[K]>
  ): void {
    const set = this.handlers.get(event);
    if (set) {
      set.delete(handler as EventHandler<any>);
    }
  }

  /**
   * Dispatches an event synchronously to all registered handlers.
   */
  public emit<K extends keyof CombinedEvents<TEvents> & string>(
    event: K,
    payload: CombinedEvents<TEvents>[K]
  ): void {
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
   */
  public emitDeferred<K extends keyof CombinedEvents<TEvents> & string>(
    event: K,
    payload: CombinedEvents<TEvents>[K]
  ): void {
    this.deferredQueue.push({ event, payload });
  }

  /**
   * Processes all currently queued deferred events.
   */
  public flushDeferred(): void {
    let iterations = 0;
    const MAX_ITERATIONS = 5;

    while (this.deferredQueue.length > 0 && iterations < MAX_ITERATIONS) {
      const queue = this.deferredQueue;
      this.deferredQueue = [];

      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        this.emit(item.event as any, item.payload);
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
      const handlers = Array.from(set);
      handlers.forEach(handler => {
        try {
          handler(payload, originalEvent);
        } catch (e) {
          console.error(`Error in EventBus handler for event "${originalEvent}" (subscribed as "${subscriptionKey}"):`, e);
        }
      });
    }
  }
}
