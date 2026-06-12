/**
 * Generic EventBus implementation for type-safe event handling.
 */

export type EventRegistry = Record<string, unknown>;

/**
 * Standard events emitted by the core engine.
 */
export interface CoreEvents {
  "engine:paused": { tick: number; timestamp: number };
  "engine:resumed": { tick: number; timestamp: number };
  "engine:destroyed": { timestamp: number };
}

/**
 * Combined registry of core and user events.
 */
export type CombinedEvents<TEvents extends EventRegistry> =
  CoreEvents & TEvents;

/**
 * Function signature for event handlers.
 */
export type EventHandler<TPayload> =
  (payload: TPayload, event: string) => void;

/**
 * EventBus class providing synchronous and deferred event emission.
 *
 * @remarks
 * Intended to facilitate communication between systems or modules.
 * Using deferred emission can help minimize reentrancy or side-effect
 * contamination during simulation ticks.
 */
export class EventBus<TEvents extends EventRegistry = EventRegistry> {
  private listeners = new Map<string, Set<EventHandler<any>>>();
  private deferredEvents: { event: string; payload: unknown }[] = [];
  private readonly maxRecursion: number;
  private recursionLevel = 0;

  constructor(options: { maxRecursion?: number } = {}) {
    this.maxRecursion = options.maxRecursion ?? 10;
  }

  /**
   * Subscribes a handler to an event.
   * @returns A function to unsubscribe the handler.
   */
  on<K extends keyof CombinedEvents<TEvents> & string>(
    event: K,
    handler: EventHandler<CombinedEvents<TEvents>[K]>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  /**
   * Subscribes a handler to an event for a single execution.
   */
  once<K extends keyof CombinedEvents<TEvents> & string>(
    event: K,
    handler: EventHandler<CombinedEvents<TEvents>[K]>
  ): () => void {
    const wrapper: EventHandler<CombinedEvents<TEvents>[K]> = (payload, name) => {
      this.off(event, wrapper);
      handler(payload, name);
    };
    return this.on(event, wrapper);
  }

  /**
   * Unsubscribes a handler from an event.
   */
  off<K extends keyof CombinedEvents<TEvents> & string>(
    event: K,
    handler: EventHandler<CombinedEvents<TEvents>[K]>
  ): void {
    this.listeners.get(event)?.delete(handler);
  }

  /**
   * Emits an event immediately to all subscribers.
   *
   * @remarks
   * Subscribers are notified synchronously in the order they were registered.
   * Recursion is limited to prevent infinite loops.
   */
  emit<K extends keyof CombinedEvents<TEvents> & string>(
    event: K,
    payload: CombinedEvents<TEvents>[K]
  ): void {
    if (this.recursionLevel > this.maxRecursion) {
      console.warn(`[EventBus] Max recursion reached for event: ${event}`);
      return;
    }

    const handlers = this.listeners.get(event);
    if (!handlers || handlers.size === 0) return;

    this.recursionLevel++;
    const handlersCopy = Array.from(handlers);
    for (const handler of handlersCopy) {
      try {
        handler(payload, event);
      } catch (e) {
        console.error(`[EventBus] Error in handler for ${event}:`, e);
      }
    }
    this.recursionLevel--;
  }

  /**
   * Queues an event to be emitted during the next flush cycle.
   */
  emitDeferred<K extends keyof CombinedEvents<TEvents> & string>(
    event: K,
    payload: CombinedEvents<TEvents>[K]
  ): void {
    this.deferredEvents.push({ event, payload });
  }

  /**
   * Emits all deferred events.
   */
  flushDeferred(): void {
    const events = [...this.deferredEvents];
    this.deferredEvents = [];
    for (const { event, payload } of events) {
      this.emit(event as any, payload as any);
    }
  }

  /**
   * Clears all listeners or those matching a specific pattern.
   */
  clear(pattern?: string): void {
    if (!pattern) {
      this.listeners.clear();
      this.deferredEvents = [];
      return;
    }
    const regex = new RegExp(pattern);
    for (const event of this.listeners.keys()) {
      if (regex.test(event)) {
        this.listeners.delete(event);
      }
    }
    this.deferredEvents = this.deferredEvents.filter(e => !regex.test(e.event));
  }
}
