import { World } from "../../core/World";
import { LootSystem } from "../LootSystem";
import { EventBus } from "../../core/EventBus";

describe("LootSystem", () => {
    let world: World;
    let eventBus: EventBus;

    beforeEach(() => {
        world = new World();
        eventBus = new EventBus();
        world.setResource("EventBus", eventBus);
    });

    test("should register listeners on onRegister, not on update", () => {
        const system = new LootSystem();

        // Mock EventBus.on
        const onSpy = jest.spyOn(eventBus, "on");

        // Should not have registered yet
        expect(onSpy).not.toHaveBeenCalled();

        // Register system
        world.addSystem(system);

        // Should have called eventBus.on during addSystem (via onRegister)
        expect(onSpy).toHaveBeenCalled();
        const callCountAfterRegister = onSpy.mock.calls.length;

        // Update world
        system.update(world, 16);

        // Should not have called eventBus.on again during update
        expect(onSpy.mock.calls.length).toBe(callCountAfterRegister);
    });
});
