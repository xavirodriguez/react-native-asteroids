"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBus = void 0;
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
 */
class EventBus {
    handlers = new Map();
    deferredEvents = [];
    isProcessing = false;
    static MAX_RECURSION = 10;
    recursionDepth = 0;
    /**
     * Subscribes a handler to an event.
     *
     * @returns A function to unsubscribe the handler.
     */
    on(event, handler) {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, new Set());
        }
        this.handlers.get(event).add(handler);
        return () => this.off(event, handler);
    }
    once(event, handler) {
        const wrapper = (payload, e) => {
            this.off(event, wrapper);
            handler(payload, e);
        };
        return this.on(event, wrapper);
    }
    off(event, handler) {
        this.handlers.get(event)?.delete(handler);
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
    emit(event, payload) {
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
                }
                catch (e) {
                    console.error(`Error in event handler for ${event}:`, e);
                }
            }
            this.recursionDepth--;
        }
    }
    /**
     * Queues an event to be processed later during {@link EventBus.flushDeferred}.
     */
    emitDeferred(event, payload) {
        this.deferredEvents.push({ event, payload });
    }
    /**
     * Executes all deferred events.
     */
    flushDeferred() {
        if (this.isProcessing)
            return;
        this.isProcessing = true;
        const events = [...this.deferredEvents];
        this.deferredEvents = [];
        for (const { event, payload } of events) {
            this.emit(event, payload);
        }
        this.isProcessing = false;
    }
    clear(pattern) {
        if (!pattern) {
            this.handlers.clear();
        }
        else {
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
exports.EventBus = EventBus;
