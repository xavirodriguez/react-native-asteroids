import { World } from "../../../../engine/core/World";
import { createParticle } from "../../EntityFactory";
import { System } from "../../../../engine/core/System";

describe("Repro Issue", () => {
    let world: World;

    beforeEach(() => {
        world = new World();
        world.debugMode = true;
    });

    it("should not fail even when debugMode is true", () => {
        const mockSystem = new class extends System {
            update(w: World) {
                createParticle({
                    world: w,
                    x: 100,
                    y: 100,
                    dx: 10,
                    dy: 10,
                    color: "white"
                });
            }
        };

        world.addSystem(mockSystem);
        expect(() => world.update(16.66)).not.toThrow();
    });
});
