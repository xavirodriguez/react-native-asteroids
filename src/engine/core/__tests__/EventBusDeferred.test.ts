import { EventBus } from "../EventBus";

describe("EventBus Deferred Enforcement", () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  it("should not execute deferred events until processDeferred is called", () => {
    const handler = jest.fn();
    eventBus.on("test", handler);
    eventBus.emitDeferred("test");
    expect(handler).not.toHaveBeenCalled();
    eventBus.processDeferred();
    expect(handler).toHaveBeenCalled();
  });

  it("should handle nested deferred events in a single flush", () => {
    const secondHandler = jest.fn();
    eventBus.on("first", () => {
      eventBus.emitDeferred("second");
    });
    eventBus.on("second", secondHandler);

    eventBus.emitDeferred("first");
    eventBus.processDeferred();

    expect(secondHandler).toHaveBeenCalled();
  });

  it("should prevent infinite loops in deferred events", () => {
    eventBus.on("ping", () => {
      eventBus.emitDeferred("pong");
    });
    eventBus.on("pong", () => {
      eventBus.emitDeferred("ping");
    });

    const spy = jest.spyOn(console, "warn").mockImplementation(() => {});
    eventBus.emitDeferred("ping");
    eventBus.processDeferred();

    expect(spy).toHaveBeenCalledWith(expect.stringContaining("Maximum deferred flush iterations reached"));
    spy.mockRestore();
  });
});
