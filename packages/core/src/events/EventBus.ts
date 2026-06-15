export type EventRegistry = Record<string, any>;

export interface CoreEvents {
  "engine:paused": { tick: number; timestamp: number };
  "engine:resumed": { tick: number; timestamp: number };
  "engine:destroyed": { timestamp: number };
}

export type CombinedEvents<TEvents extends EventRegistry> = CoreEvents & TEvents;

export type EventHandler<TPayload> = (payload: TPayload, event: string) => void;

/**
 * A central event bus for decoupling world events from system logic.
 *
 * @remarks
 * Supports both immediate (`emit`) and deferred (`emitDeferred`) execution.
 * Deferred events are processed when `flushDeferred` is called, typically at
 * the end of a simulation step.
 *
 * @typeParam TEvents - The registry of custom events for this bus.
 */
export class EventBus<TEvents extends EventRegistry = any> {
  private handlers = new Map<string, Set<EventHandler<any>>>();
  private deferredEvents: { event: string; payload: any }[] = [];
  private isProcessing = false;
  private static MAX_RECURSION = 10;
  private recursionDepth = 0;

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
    this.handlers.get(event)!.add(handler);
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
    this.handlers.get(event)?.delete(handler);
  }

  /**
   * Synchronously notifies all handlers of an event.
   *
   * @warning
   * Excessive use of immediate `emit` can lead to complex call stacks and
   * circular dependencies. It is limited to {@link MAX_RECURSION} levels.
   */
  emit<K extends keyof CombinedEvents<TEvents> & string>(
    event: K,
    payload: CombinedEvents<TEvents>[K]
  ): void {
    if (this.recursionDepth > EventBus.MAX_RECURSION) {
      console.warn(`EventBus: Max recursion depth reached for event ${event}`);
      return;
    }

    const handlers = this.handlers.get(event);
    if (handlers) {
      this.recursionDepth++;
      const handlersCopy = Array.from(handlers);
      for (const handler of handlersCopy) {
        try {
          handler(payload, event);
        } catch (e) {
          console.error(`Error in event handler for ${event}:`, e);
        }
      }
      this.recursionDepth--;
    }
  }

  /**
   * Queues an event to be processed later during {@link flushDeferred}.
   */
  emitDeferred<K extends keyof CombinedEvents<TEvents> & string>(
    event: K,
    payload: CombinedEvents<TEvents>[K]
  ): void {
    this.deferredEvents.push({ event, payload });
  }

  /**
   * Executes all deferred events.
   *
   * @internal
   */
  flushDeferred(): void {
    if (this.isProcessing) return;
    this.isProcessing = true;
    const events = [...this.deferredEvents];
    this.deferredEvents = [];
    for (const { event, payload } of events) {
      this.emit(event as any, payload);
    }
    this.isProcessing = false;
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
    this.deferredEvents = [];
  }
}
