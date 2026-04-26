import { EventBus } from "../EventBus";

describe("EventBus", () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it("should handle basic on/emit", () => {
    const handler = jest.fn();
    bus.on("test", handler);
    bus.emit("test", { data: 123 });
    expect(handler).toHaveBeenCalledWith({ data: 123 }, "test");
  });

  it("should handle multiple handlers for the same event", () => {
    const h1 = jest.fn();
    const h2 = jest.fn();
    bus.on("test", h1);
    bus.on("test", h2);
    bus.emit("test", "foo");
    expect(h1).toHaveBeenCalledWith("foo", "test");
    expect(h2).toHaveBeenCalledWith("foo", "test");
  });

  it("should handle once subcriptions", () => {
    const handler = jest.fn();
    bus.once("test", handler);
    bus.emit("test", 1);
    bus.emit("test", 2);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(1, "test");
  });

  it("should handle off (unsubscribe)", () => {
    const handler = jest.fn();
    bus.on("test", handler);
    bus.off("test", handler);
    bus.emit("test", "nope");
    expect(handler).not.toHaveBeenCalled();
  });

  it("should handle namespaced wildcard emissions", () => {
    const wildcardHandler = jest.fn();
    const exactHandler = jest.fn();

    bus.on("game:*", wildcardHandler);
    bus.on("game:start", exactHandler);

    bus.emit("game:start", { level: 1 });

    expect(exactHandler).toHaveBeenCalledWith({ level: 1 }, "game:start");
    expect(wildcardHandler).toHaveBeenCalledWith({ level: 1 }, "game:start");
  });

  it("should handle global wildcard emissions", () => {
    const globalHandler = jest.fn();
    bus.on("*", globalHandler);

    bus.emit("anything", "payload");
    expect(globalHandler).toHaveBeenCalledWith("payload", "anything");
  });

  it("should clear handlers by pattern", () => {
    const h1 = jest.fn();
    const h2 = jest.fn();
    bus.on("game:start", h1);
    bus.on("ui:click", h2);

    bus.clear("game:*");
    bus.emit("game:start", {});
    bus.emit("ui:click", {});

    expect(h1).not.toHaveBeenCalled();
    expect(h2).toHaveBeenCalled();
  });
});
