import { World } from "../World";
import { Schedule } from "../Schedule";
import { System, SystemPhase } from "../System";
import { RandomService } from "../../utils/RandomService";

describe("Schedule Unit Tests", () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  it("Test de Orden de Fases: should run systems in exact sequential order of configured phases", () => {
    const executed: string[] = [];

    class TestSystem extends System {
      constructor(private phaseName: string) {
        super();
      }
      update(world: World, deltaTime: number): void {
        executed.push(this.phaseName);
      }
    }

    const schedule = new Schedule();
    const customWorld = new World(schedule);

    // Register systems out of phase order to ensure schedule orders them correctly
    customWorld.addSystem(new TestSystem("Presentation"), { phase: SystemPhase.Presentation });
    customWorld.addSystem(new TestSystem("Collision"), { phase: SystemPhase.Collision });
    customWorld.addSystem(new TestSystem("Input"), { phase: SystemPhase.Input });
    customWorld.addSystem(new TestSystem("Simulation"), { phase: SystemPhase.Simulation });
    customWorld.addSystem(new TestSystem("GameRules"), { phase: SystemPhase.GameRules });
    customWorld.addSystem(new TestSystem("Transform"), { phase: SystemPhase.Transform });

    customWorld.update(1 / 60);

    expect(executed).toEqual([
      SystemPhase.Input,
      SystemPhase.Simulation,
      SystemPhase.Transform,
      SystemPhase.Collision,
      SystemPhase.GameRules,
      SystemPhase.Presentation
    ]);
  });

  it("Test de Robustez (Try...Finally): should reset world.isUpdating and RandomService.lockGameplayContext when a system throws an error", () => {
    class FaultySystem extends System {
      update(world: World, deltaTime: number): void {
        throw new Error("Simulated system failure");
      }
    }

    const schedule = new Schedule();
    const customWorld = new World(schedule);
    customWorld.addSystem(new FaultySystem(), { phase: SystemPhase.Simulation });

    expect(() => {
      customWorld.update(1 / 60);
    }).toThrow("Simulated system failure");

    expect(customWorld.isUpdating).toBe(false);
    expect(RandomService.lockGameplayContext).toBe(false);
  });

  it("Test de Flush: should call world.flush() exactly once after all phases are finished", () => {
    const schedule = new Schedule();
    const customWorld = new World(schedule);

    // Spy on the flush method
    const flushSpy = jest.spyOn(customWorld, "flush");

    customWorld.update(1 / 60);

    expect(flushSpy).toHaveBeenCalledTimes(1);
    flushSpy.mockRestore();
  });
});
