import { World } from "../../core/World";
import { System } from "../../core/System";

class MockSystem extends System {
    public onRegisterCalled = 0;
    public onUnregisterCalled = 0;
    public lastWorld: World | null = null;

    public onRegister(world: World): void {
        this.onRegisterCalled++;
        this.lastWorld = world;
    }

    public onUnregister(world: World): void {
        this.onUnregisterCalled++;
        this.lastWorld = world;
    }

    public update(_world: World, _deltaTime: number): void {}
}

describe("World System Lifecycle", () => {
    let world: World;

    beforeEach(() => {
        world = new World();
    });

    test("addSystem should call onRegister", () => {
        const system = new MockSystem();
        world.addSystem(system);

        expect(system.onRegisterCalled).toBe(1);
        expect(system.lastWorld).toBe(world);
    });

    test("clearSystems should call onUnregister", () => {
        const system = new MockSystem();
        world.addSystem(system);
        world.clearSystems();

        expect(system.onUnregisterCalled).toBe(1);
        expect(system.lastWorld).toBe(world);
    });

    test("addSystem should not call onRegister if system already registered", () => {
        const system = new MockSystem();
        world.addSystem(system);
        world.addSystem(system); // Duplicate

        expect(system.onRegisterCalled).toBe(1);
    });
});
