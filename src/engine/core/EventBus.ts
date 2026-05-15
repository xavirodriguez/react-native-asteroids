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

  public on<T = unknown>(event: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler<unknown>);
  }

  public once<T = unknown>(event: string, handler: EventHandler<T>): void {
    const onceHandler: EventHandler<T> = (payload, eventName) => {
      this.off(event, onceHandler);
      handler(payload, eventName);
    };
    this.on(event, onceHandler);
  }

  public off<T = unknown>(event: string, handler: EventHandler<T>): void {
    const set = this.handlers.get(event);
    if (set) {
      set.delete(handler as EventHandler<unknown>);
    }
  }

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

  public emitDeferred<T = unknown>(event: string, payload?: T): void {
    this.deferredQueue.push({ event, payload });
  }

  public processDeferred(): void {
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
