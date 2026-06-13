import { EventBus } from "../src";

describe("EventBus", () => {
  it("should emit and receive events", () => {
    const bus = new EventBus<{ "test-event": { value: number } }>();
    let receivedValue = 0;

    bus.on("test-event", (payload) => {
      receivedValue = payload.value;
    });

    bus.emit("test-event", { value: 42 });
    expect(receivedValue).toBe(42);
  });

  it("should handle deferred events", () => {
    const bus = new EventBus<{ "deferred": { msg: string } }>();
    let receivedMsg = "";

    bus.on("deferred", (p) => {
      receivedMsg = p.msg;
    });

    bus.emitDeferred("deferred", { msg: "hello" });
    expect(receivedMsg).toBe("");

    bus.flushDeferred();
    expect(receivedMsg).toBe("hello");
  });
});
