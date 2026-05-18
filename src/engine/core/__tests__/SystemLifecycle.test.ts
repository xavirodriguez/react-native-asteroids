import { World } from "../World";
import { System } from "../System";

describe("World System Lifecycle", () => {
    it("should call onRegister when a system is added", () => {
        const world = new World();
        const onRegisterSpy = jest.fn();

        class TestSystem extends System {
            update() {}
            onRegister(w: World) {
                onRegisterSpy(w);
            }
        }

        const system = new TestSystem();
        world.addSystem(system);

        expect(onRegisterSpy).toHaveBeenCalledWith(world);
        expect(onRegisterSpy).toHaveBeenCalledTimes(1);
    });

    it("should not call onRegister again if the same system is added twice", () => {
        const world = new World();
        const onRegisterSpy = jest.fn();

        class TestSystem extends System {
            update() {}
            onRegister() {
                onRegisterSpy();
            }
        }

        const system = new TestSystem();
        world.addSystem(system);
        world.addSystem(system);

        expect(onRegisterSpy).toHaveBeenCalledTimes(1);
    });
});
