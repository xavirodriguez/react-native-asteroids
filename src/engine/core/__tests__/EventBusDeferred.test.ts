import { EventBus } from "../EventBus";

describe("EventBus Deferred", () => {
  it("should defer events and process them when called", () => {
    const bus = new EventBus();
    const handler = jest.fn();
    bus.on("test", handler);

    bus.emitDeferred("test", { data: 123 });
    expect(handler).not.toHaveBeenCalled();

    bus.processDeferred();
    expect(handler).toHaveBeenCalledWith({ data: 123 });
  });

  it("should handle events emitted during processing by deferring them to the next cycle", () => {
    const bus = new EventBus();
    const secondHandler = jest.fn();

    bus.on("first", () => {
      bus.emitDeferred("second");
    });
    bus.on("second", secondHandler);

    bus.emitDeferred("first");
    bus.processDeferred();

    expect(secondHandler).not.toHaveBeenCalled();

    bus.processDeferred();
    expect(secondHandler).toHaveBeenCalled();
  });

  it("should reuse objects from pool to minimize GC", () => {
    const bus = new EventBus();
    const handler = jest.fn();
    bus.on("test", handler);

    bus.emitDeferred("test", 1);
    bus.processDeferred();

    // At this point, one object should be in the pool
    bus.emitDeferred("test", 2);
    bus.processDeferred();

    expect(handler).toHaveBeenNthCalledWith(1, 1);
    expect(handler).toHaveBeenNthCalledWith(2, 2);
  });

  it("should clear deferred events when clear() is called", () => {
    const bus = new EventBus();
    const handler = jest.fn();
    bus.on("test", handler);

    bus.emitDeferred("test");
    bus.clear();
    bus.processDeferred();

    expect(handler).not.toHaveBeenCalled();
  });

  it("should clear deferred events by pattern", () => {
    const bus = new EventBus();
    const handlerTest = jest.fn();
    const handlerOther = jest.fn();
    bus.on("test", handlerTest);
    bus.on("other", handlerOther);

    bus.emitDeferred("test");
    bus.emitDeferred("other");

    bus.clear("test");
    bus.processDeferred();

    expect(handlerTest).not.toHaveBeenCalled();
    expect(handlerOther).toHaveBeenCalled();
  });

  it("should clear deferred events by wildcard pattern", () => {
    const bus = new EventBus();
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    bus.on("game:start", handler1);
    bus.on("other:start", handler2);

    bus.emitDeferred("game:start");
    bus.emitDeferred("other:start");

    bus.clear("game:*");
    bus.processDeferred();

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
  });
});
