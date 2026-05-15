/**
 * Typed Event Bus for decoupled communication between systems and scenes.
 * Implements the Pub/Sub pattern with support for namespaces and wildcards.
 *
 * @remarks
 * Events can be specific (e.g., `player:hit`) or generic using asterisks (e.g., `player:*` or `*`).
 */
export type EventHandler<T = unknown> = (payload: T, event: string) => void;

/**
 * Messaging system designed for synchronous and deferred communication based on the Pub/Sub pattern.
 *
 * API status: Public
 *
 * Responsibility: Dispatch notifications to registered subscribers.
 *
 * Responsibility: Isolate errors of individual listeners via try-catch blocks.
 *
 * Responsibility: Protect against infinite recursion via a depth counter.
 *
 * @remarks
 * The EventBus facilitates decoupling between systems. It supports hierarchical
 * event names and wildcards. Allows emitting synchronous and deferred events. Deferred events are useful
 * to avoid immediate side effects (like SFX) that could break determinism
 * if executed during the resimulation/rollback phase.
 *
 * Conceptual Risk: [ORDER][MEDIUM] The execution order of handlers for the same event
 * is not guaranteed and should not be relied upon.
 *
 * ### Features
 *
 * 1. **Emit Synchronous**: `emit()` executes subscribers immediately.
 * 2. **Emit Deferred**: `emitDeferred()` enqueues the event to be processed at the end of the frame.
 * 3. **Recursion Guard**: Protects against infinite event loops by limiting depth to 10 levels.
 */
export class EventBus {
  private handlers = new Map<string, Set<EventHandler<unknown>>>();
  private deferredQueue: Array<{ event: string; payload?: unknown }> = [];
  private emitDepth = 0;
  private readonly MAX_RECURSION = 10;

  /**
   * Subscribes a handler to a specific event or pattern.
   *
   * @param event - Event name or pattern (e.g., "game:score_changed", "entity:*").
   * @param handler - Callback function that will receive the event data.
   *
   * Postcondition: The handler will be added to the set of event subscribers.
   */
  public on<T = unknown>(event: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler<unknown>);
  }

  /**
   * Subscribes a handler that will be executed only once.
   *
   * @param event - Event name.
   * @param handler - Callback function.
   *
   * Postcondition: The handler is automatically removed after the first successful execution.
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
   * Emits an event and notifies subscribers that match the name or pattern.
   *
   * @remarks
   * The notification is performed synchronously. Exact subscribers are notified first,
   * then namespace subscribers (e.g., "game:*") and finally the global wildcard ("*").
   *
   * @param event - Event name.
   * @param payload - Data associated with the event.
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
   * Enqueues an event to be processed later via processDeferred().
   *
   * @param event - Event name.
   * @param payload - Event data.
   *
   * ### Determinism and Side-Effects:
   * `emitDeferred` is critical for maintaining simulation determinism. Logic inside
   * ECS systems should use deferred events for any action that produces side-effects
   * external to the ECS World (e.g., playing SFX, logging, triggering UI animations).
   *
   * This ensures that if a simulation tick is rolled back or re-simulated, the
   * side-effects are only executed once at the end of the real-time frame.
   */
  public emitDeferred<T = unknown>(event: string, payload?: T): void {
    this.deferredQueue.push({ event, payload });
  }

  /**
   * Processes all events currently in the deferred queue.
   */
  public processDeferred(): void {
    if (this.deferredQueue.length === 0) return;

    const queue = this.deferredQueue;
    this.deferredQueue = [];

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      this.emit(item.event, item.payload);
    }
  }

  /**
   * Clears handlers matching a pattern or all if none provided.
   */
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
