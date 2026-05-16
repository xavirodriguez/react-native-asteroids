import { EventBus } from "../EventBus";

describe("EventBus Deferred Events", () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  it("should not execute deferred events immediately", () => {
    let executed = false;
    eventBus.on("test", () => {
      executed = true;
    });

    eventBus.emitDeferred("test");
    expect(executed).toBe(false);

    eventBus.processDeferred();
    expect(executed).toBe(true);
  });

  it("should process events in order", () => {
    const order: number[] = [];
    eventBus.on("1", () => order.push(1));
    eventBus.on("2", () => order.push(2));

    eventBus.emitDeferred("1");
    eventBus.emitDeferred("2");

    eventBus.processDeferred();
    expect(order).toEqual([1, 2]);
  });

  it("should handle nested deferred emissions", () => {
    const order: string[] = [];
    eventBus.on("outer", () => {
      order.push("outer_done");
      eventBus.emitDeferred("inner");
    });
    eventBus.on("inner", () => {
      order.push("inner_done");
    });

    eventBus.emitDeferred("outer");
    eventBus.processDeferred();

    expect(order).toEqual(["outer_done", "inner_done"]);
  });
});
