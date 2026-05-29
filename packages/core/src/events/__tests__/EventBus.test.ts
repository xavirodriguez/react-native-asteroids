import { EventBus } from "../EventBus";

type TestEvents = {
  "test:event": { value: number };
};

describe("EventBus", () => {
  it("should emit and receive events", () => {
    const bus = new EventBus<TestEvents>();
    const handler = jest.fn();

    bus.on("test:event", handler);
    bus.emit("test:event", { value: 42 });

    expect(handler).toHaveBeenCalledWith({ value: 42 }, "test:event");
  });

  it("should handle deferred events", () => {
    const bus = new EventBus<TestEvents>();
    const handler = jest.fn();

    bus.on("test:event", handler);
    bus.emitDeferred("test:event", { value: 42 });

    expect(handler).not.toHaveBeenCalled();

    bus.flushDeferred();
    expect(handler).toHaveBeenCalledWith({ value: 42 }, "test:event");
  });
});
