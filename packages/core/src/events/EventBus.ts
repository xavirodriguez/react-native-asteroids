export type EventRegistry = Record<string, any>;

export type EventHandler<T = any> = (data: T) => void;

export class EventBus<TEvents extends EventRegistry = EventRegistry> {
  private handlers = new Map<string, Set<EventHandler>>();
  private deferredEvents: { event: string; data: any }[] = [];

  on<K extends keyof TEvents & string>(event: K, handler: EventHandler<TEvents[K]>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  emit<K extends keyof TEvents & string>(event: K, data: TEvents[K]): void {
    this.handlers.get(event)?.forEach(handler => handler(data));
  }

  emitDeferred<K extends keyof TEvents & string>(event: K, data: TEvents[K]): void {
    this.deferredEvents.push({ event, data });
  }

  flush(): void {
    const events = this.deferredEvents;
    this.deferredEvents = [];
    events.forEach(({ event, data }) => this.emit(event as any, data));
  }
}
