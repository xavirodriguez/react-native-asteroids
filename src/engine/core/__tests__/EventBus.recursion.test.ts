import { EventBus } from "../EventBus";

describe("EventBus Recursion and Deferred Emission", () => {
  it("should prevent infinite recursion using MAX_RECURSION_DEPTH", () => {
    const bus = new EventBus();
    let callCount = 0;
    const spy = jest.spyOn(console, "warn").mockImplementation(() => {});

    bus.on("loop", () => {
      callCount++;
      bus.emit("loop");
    });

    bus.emit("loop");

    // MAX_RECURSION_DEPTH is 10.
    // Initial emit (1) + 9 recursive emits = 10.
    // The 11th call should be deferred.
    // But then processDeferred runs and it continues until MAX_DEFERRED_ITERATIONS (100)
    // or until the queue is empty.
    // In our loop case, it hits MAX_DEFERRED_ITERATIONS + original calls.
    expect(callCount).toBeGreaterThanOrEqual(10);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("Max recursion depth reached"));

    spy.mockRestore();
  });

  it("should process deferred events after the current stack", () => {
    const bus = new EventBus();
    const executionOrder: string[] = [];

    bus.on("start", () => {
      executionOrder.push("start_handler");
      bus.emitDeferred("deferred");
      executionOrder.push("start_end");
    });

    bus.on("deferred", () => {
      executionOrder.push("deferred_handler");
    });

    bus.emit("start");

    expect(executionOrder).toEqual(["start_handler", "start_end", "deferred_handler"]);
  });

  it("should handle deep recursion by deferring and then processing", () => {
    const bus = new EventBus();
    let totalCalls = 0;

    bus.on("ping", (count: number) => {
      totalCalls++;
      if (count > 0) {
        bus.emit("ping", count - 1);
      }
    });

    // Emitting with 15 depth. 10 should be synchronous, 5 should be deferred and processed later.
    bus.emit("ping", 15);

    expect(totalCalls).toBe(16); // 0 to 15 = 16 calls
  });

  it("should clear deferredQueue when clear() is called", () => {
    const bus = new EventBus();
    let callCount = 0;
    bus.on("test", () => callCount++);

    bus.emitDeferred("test");
    bus.clear();

    // We need a way to trigger processDeferred or just check if it's empty.
    // In our implementation, processDeferred is private and called at the end of emit.
    // If we emit something else, it shouldn't trigger the cleared deferred event.
    bus.emit("other");

    expect(callCount).toBe(0);
  });
});
