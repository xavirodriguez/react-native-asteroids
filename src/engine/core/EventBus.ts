/**
 * Typed Event Bus for system-to-system and scene-to-system communication.
 * Supports namespaced events (namespace:event) and wildcards (*).
 */
export type EventHandler<T = any> = (payload: T) => void;

export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  /**
   * Subscribes to an event.
   * @param event The event name or pattern (e.g., "game:score_changed", "entity:*")
   * @param handler The callback function
   */
  public on<T = any>(event: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  /**
   * Subscribes to an event once.
   */
  public once<T = any>(event: string, handler: EventHandler<T>): void {
    const onceHandler: EventHandler<T> = (payload) => {
      this.off(event, onceHandler);
      handler(payload);
    };
    this.on(event, onceHandler);
  }

  /**
   * Unsubscribes from an event.
   */
  public off<T = any>(event: string, handler: EventHandler<T>): void {
    const set = this.handlers.get(event);
    if (set) {
      set.delete(handler);
    }
  }

  /**
   * Emits an event with a payload.
   * Notifies exact match listeners and matching wildcard listeners.
   */
  public emit<T = any>(event: string, payload: T): void {
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

  private notify(event: string, payload: any): void {
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
