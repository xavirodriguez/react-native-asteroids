import { World } from "../src/ecs/World";
import { EventBus } from "../src/events/EventBus";
import { SceneManager, SceneState } from "../src/scenes/SceneManager";
import { Scene } from "../src/scenes/Scene";

describe("Refactoring Tests: EventBus & SceneManager", () => {
  describe("EventBus Traceability & Recursion", () => {
    it("should trace the event path using currentEventChain and respect maxRecursion", () => {
      const bus = new EventBus<{
        "eventA": { dummy?: boolean };
        "eventB": { dummy?: boolean };
        "eventC": { dummy?: boolean };
      }>({ maxRecursion: 3 });

      const chainAtB: string[] = [];
      const chainAtC: string[] = [];

      bus.on("eventA", () => {
        bus.emit("eventB", {});
      });

      bus.on("eventB", () => {
        chainAtB.push(...bus.currentEventChain);
        bus.emit("eventC", {});
      });

      bus.on("eventC", () => {
        chainAtC.push(...bus.currentEventChain);
        // This is 4th level, should trigger max recursion warning and not propagate further
        bus.emit("eventA", {});
      });

      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

      bus.emit("eventA", {});

      // Verify traces
      expect(chainAtB).toEqual(["eventA", "eventB"]);
      expect(chainAtC).toEqual(["eventA", "eventB", "eventC"]);

      // Verify that recursion limit was reached and console.warn called
      expect(warnSpy).toHaveBeenCalledWith(
        "EventBus: Max recursion depth reached for event eventA"
      );

      // Verify state is clean after emission completes
      expect(bus.currentEventChain).toEqual([]);
      warnSpy.mockRestore();
    });
  });

  describe("EventBus GC Optimization (Double Buffer)", () => {
    it("should flush deferred events using double buffering without reallocating arrays", () => {
      const bus = new EventBus<{ "deferred1": { val: number }; "deferred2": { val: number } }>();
      const received: number[] = [];

      bus.on("deferred1", (p) => received.push(p.val));
      bus.on("deferred2", (p) => received.push(p.val));

      // Capture original primary and secondary buffer references
      const originalPrimary = (bus as any).primaryBuffer;
      const originalSecondary = (bus as any).secondaryBuffer;

      bus.emitDeferred("deferred1", { val: 10 });
      bus.emitDeferred("deferred2", { val: 20 });

      expect(received).toEqual([]);

      bus.flushDeferred();

      expect(received).toEqual([10, 20]);

      // Check references have been swapped, and no new arrays were instantiated
      const newPrimary = (bus as any).primaryBuffer;
      const newSecondary = (bus as any).secondaryBuffer;

      expect(newPrimary).toBe(originalSecondary);
      expect(newSecondary).toBe(originalPrimary);
      expect(newPrimary.length).toBe(0);
      expect(newSecondary.length).toBe(0);
    });

    it("should handle nested emitDeferred calls correctly during flushDeferred without mutating the active flush list", () => {
      const bus = new EventBus<{ "first": { dummy?: boolean }; "nested": { dummy?: boolean } }>();
      const calls: string[] = [];

      bus.on("first", () => {
        calls.push("first_handled");
        bus.emitDeferred("nested", {});
      });

      bus.on("nested", () => {
        calls.push("nested_handled");
      });

      bus.emitDeferred("first", {});
      bus.flushDeferred();

      // Nested deferred event should go to primary buffer, not secondary buffer being currently flushed
      expect(calls).toEqual(["first_handled"]);

      // Flush again to process the nested event
      bus.flushDeferred();
      expect(calls).toEqual(["first_handled", "nested_handled"]);
    });

    it("should clear both buffers on clear()", () => {
      const bus = new EventBus();
      bus.emitDeferred("any" as any, {});
      (bus as any).secondaryBuffer.push({ event: "dummy", payload: {} });

      bus.clear();
      expect((bus as any).primaryBuffer.length).toBe(0);
      expect((bus as any).secondaryBuffer.length).toBe(0);
    });
  });

  describe("SceneManager Transition Timeout & Rollback", () => {
    class MockScene extends Scene {
      public enterCalled = false;
      public exitCalled = false;
      public resumeCalled = false;
      public isPaused = false;
      private onEnterDelay = 0;

      constructor(world: World, name: string, onEnterDelay = 0) {
        super(world);
        this.name = name;
        this.onEnterDelay = onEnterDelay;
      }

      public override async onEnter() {
        if (this.onEnterDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, this.onEnterDelay));
        }
        this.enterCalled = true;
      }

      public override async onExit() {
        this.exitCalled = true;
      }

      public override onResume() {
        this.resumeCalled = true;
      }
    }

    let world: World;
    let eventBus: EventBus;
    let manager: SceneManager;

    beforeEach(() => {
      world = new World();
      eventBus = new EventBus();
      world.setResource("EventBus", eventBus);
      manager = new SceneManager(world);
    });

    it("should transition successfully and fire events", async () => {
      const sceneA = new MockScene(new World(), "SceneA");
      const startSpy = jest.fn();
      const successSpy = jest.fn();

      eventBus.on("scene:transition:start" as any, startSpy);
      eventBus.on("scene:transition:success" as any, successSpy);

      await manager.transitionTo(sceneA);

      expect(manager.getCurrentScene()).toBe(sceneA);
      expect(manager.getState()).toBe(SceneState.ACTIVE);
      expect(sceneA.enterCalled).toBe(true);

      expect(startSpy).toHaveBeenCalledWith({ scene: sceneA }, "scene:transition:start");
      expect(successSpy).toHaveBeenCalledWith({ scene: sceneA }, "scene:transition:success");
    });

    it("should rollback to oldScene and fire timeout event on timeout", async () => {
      const sceneA = new MockScene(new World(), "SceneA");
      await manager.transitionTo(sceneA);

      const sceneB = new MockScene(new World(), "SceneB", 100); // 100ms delay in onEnter

      const timeoutSpy = jest.fn();
      eventBus.on("scene:transition:timeout" as any, timeoutSpy);

      // Transition with 20ms timeout
      await expect(manager.transitionTo(sceneB, { timeout: 20 })).rejects.toThrow("Transition timed out");

      // Verify rollback
      expect(manager.getCurrentScene()).toBe(sceneA);
      expect(manager.getState()).toBe(SceneState.ACTIVE);
      expect(sceneB.enterCalled).toBe(false);

      expect(timeoutSpy).toHaveBeenCalledWith(
        expect.objectContaining({ scene: sceneB, error: expect.any(Error) }),
        "scene:transition:timeout"
      );
    });

    it("should prevent zombie/obsolete scene from taking over state using transitionToken", async () => {
      const sceneA = new MockScene(new World(), "SceneA");
      await manager.transitionTo(sceneA);

      // sceneB has a 50ms delay inside onEnter
      const sceneB = new MockScene(new World(), "SceneB", 50);

      // Transition with 10ms timeout -> triggers timeout rollback immediately
      await expect(manager.transitionTo(sceneB, { timeout: 10 })).rejects.toThrow("Transition timed out");

      // Now immediately transition to sceneC
      const sceneC = new MockScene(new World(), "SceneC");
      await manager.transitionTo(sceneC);

      expect(manager.getCurrentScene()).toBe(sceneC);
      expect(manager.getState()).toBe(SceneState.ACTIVE);

      // Wait 100ms for sceneB's delayed onEnter to finish in the background
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify sceneB's onEnter did run/complete, but did NOT overwrite currentScene because of the token check
      expect(sceneB.enterCalled).toBe(true);
      expect(manager.getCurrentScene()).toBe(sceneC);
    });

    it("should resume old scene on rollback only if old scene was marked as paused", async () => {
      const sceneA = new MockScene(new World(), "SceneA");
      sceneA.isPaused = true;
      await manager.transitionTo(sceneA);

      const sceneB = new MockScene(new World(), "SceneB", 50);

      await expect(manager.transitionTo(sceneB, { timeout: 10 })).rejects.toThrow("Transition timed out");

      expect(manager.getCurrentScene()).toBe(sceneA);
      expect(sceneA.resumeCalled).toBe(true);
    });
  });
});
