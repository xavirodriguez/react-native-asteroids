import { World, ReadOnlyWorld } from "../World";
import { SystemPhase } from "../System";
import { EventBus } from "../EventBus";

describe("World Enhancements", () => {
  it("should emit entity:destroyed when removing an entity", () => {
    const world = new World();
    const eventBus = new EventBus();
    world.setResource("EventBus", eventBus);
    const handler = jest.fn();
    eventBus.on("entity:destroyed", handler);

    const entity = world.createEntity();
    world.removeEntity(entity);

    expect(handler).toHaveBeenCalledWith({ entity, world });
  });

  it("should execute systems in a specific phase", () => {
    const world = new World();
    const mockUpdate = jest.fn();
    const system = { update: mockUpdate };

    world.addSystem(system as any, { phase: SystemPhase.Collision });

    world.executeSystemsInPhase(SystemPhase.Simulation, 16);
    expect(mockUpdate).not.toHaveBeenCalled();

    world.executeSystemsInPhase(SystemPhase.Collision, 16);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("should enforce read-only world during Presentation phase", () => {
    const world = new World();
    const mockUpdate = jest.fn((w: World) => {
        w.createEntity();
    });
    const system = { update: mockUpdate };

    world.addSystem(system as any, { phase: SystemPhase.Presentation });

    expect(() => {
        world.executeSystemsInPhase(SystemPhase.Presentation, 16);
    }).toThrow("ReadOnlyWorldViolation");
  });
});
