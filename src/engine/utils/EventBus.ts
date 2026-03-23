export type EventCallback<T = any> = (payload: T) => void;

/**
 * Lightweight, type-safe event bus for decoupled communication between systems.
 */
export class EventBus {
  private listeners = new Map<string, Set<EventCallback>>();

  /**
   * Subscribes to an event.
   *
   * @param event - The event name.
   * @param callback - The function to call when the event is emitted.
   * @returns An unsubscribe function.
   */
  public on<T = any>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const callbacks = this.listeners.get(event)!;
    callbacks.add(callback);

    return () => {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  /**
   * Emits an event to all subscribers.
   *
   * @param event - The event name.
   * @param payload - The data to pass to the subscribers.
   */
  public emit<T = any>(event: string, payload: T): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(payload));
    }
  }

  /**
   * Clears all listeners.
   */
  public clear(): void {
    this.listeners.clear();
  }
}
