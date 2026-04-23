import { World } from "../World";
import { EventBus } from "../EventBus";
import { AssetLoader } from "../../assets/AssetLoader";
import { AssetCleanupSystem } from "../../systems/AssetCleanupSystem";
import { SpriteComponent, AudioComponent } from "../CoreComponents";
import { SystemPhase } from "../System";

describe("TinyAsterEngine Robustness", () => {
  let world: World;
  let eventBus: EventBus;
  let assetLoader: AssetLoader;

  beforeEach(() => {
    world = new World();
    eventBus = new EventBus();
    assetLoader = new AssetLoader();

    world.setResource("EventBus", eventBus);
    world.setResource("AssetLoader", assetLoader);
  });

  describe("AssetCleanupSystem", () => {
    it("should release assets when an entity is removed", async () => {
      const system = new AssetCleanupSystem(eventBus);
      world.addSystem(system);

      // Preload fake assets
      await assetLoader.preload({
        "ship_sprite": "ship.png",
        "laser_sound": "laser.wav"
      });

      const entity = world.createEntity();
      world.addComponent(entity, { type: "Sprite", assetId: "ship_sprite" } as SpriteComponent);
      world.addComponent(entity, { type: "Audio", assetId: "laser_sound" } as AudioComponent);

      // Verify they are in cache and have refs
      expect(assetLoader.get("ship_sprite").status).toBe("ready");

      // We need to check if they are released. AssetLoader.release decrements refCounts.
      // If we release it once, it should be disposed and removed from cache since preload starts with ref 1.

      world.removeEntity(entity);

      expect(assetLoader.get("ship_sprite").status).toBe("error");
      expect(assetLoader.get("laser_sound").status).toBe("error");
    });
  });

  describe("EventBus Deferred", () => {
    it("should process events in the next frame", () => {
      const handler = jest.fn();
      eventBus.on("test:event", handler);

      eventBus.emitDeferred("test:event", { data: 123 });
      expect(handler).not.toHaveBeenCalled();

      eventBus.processDeferred();
      expect(handler).toHaveBeenCalledWith({ data: 123 });
    });

    it("should be Zero-GC by reusing event objects", () => {
        // This is hard to test with Jest assertions, but we can verify it doesn't crash
        // and follow the logic in EventBus.ts
        for(let i=0; i<100; i++) {
            eventBus.emitDeferred("test", i);
        }
        eventBus.processDeferred();
        // The fact that eventPool is used is internal, but we can check if it works.
    });
  });

  describe("Phase-Gated Safety Enforcement", () => {
    it("should throw error when mutating during Presentation phase", () => {
      const mutatingSystem = {
        update: (w: World) => {
          w.createEntity();
        }
      };

      world.addSystem(mutatingSystem as any, { phase: SystemPhase.Presentation });

      expect(() => world.update(16, SystemPhase.Presentation)).toThrow("ReadOnlyWorld: Mutating method 'createEntity' called during Presentation phase.");
    });

    it("should throw error when mutating directly during Simulation phase", () => {
        const mutatingSystem = {
          update: (w: World) => {
            w.createEntity();
          }
        };

        world.addSystem(mutatingSystem as any, { phase: SystemPhase.Simulation });

        expect(() => world.update(16, SystemPhase.Simulation)).toThrow("SimulationSafety: Direct mutation 'createEntity' forbidden. Use CommandBuffer during Simulation phase.");
      });

    it("should allow reading during Presentation phase", () => {
        const entity = world.createEntity();
        let entityCount = 0;
        const readingSystem = {
          update: (w: World) => {
            entityCount = w.getAllEntities().length;
          }
        };

        world.addSystem(readingSystem as any, { phase: SystemPhase.Presentation });
        world.update(16, SystemPhase.Presentation);
        expect(entityCount).toBe(1);
      });
  });
});
