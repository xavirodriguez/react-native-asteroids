import { World } from "../../../../engine/core/World";
import { createBullet, createParticle } from "../../EntityFactory";
import { System } from "../../../../engine/core/System";

describe("Asteroids Structural Mutation Safety", () => {
    let world: World;

    beforeEach(() => {
        world = new World();
    });

    it("should allow createBullet during world update without throwing", () => {
        const mockSystem = new class extends System {
            update(w: World) {
                createBullet({
                    world: w,
                    x: 100,
                    y: 100,
                    angle: 0
                });
            }
        };

        world.addSystem(mockSystem);

        // This should not throw "Structural mutation ... during update is forbidden"
        expect(() => world.update(16.66)).not.toThrow();

        // After flush, bullet should exist
        expect(world.query("Bullet").length).toBe(1);
    });

    it("should allow createParticle during world update without throwing", () => {
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

        // After flush, Particle entity (Transform + Velocity + Render + TTL) should exist
        const entities = world.query("Render");
        const particle = entities.find(e => (world.getComponent(e, "Render") as any).shape === "particle");
        expect(particle).toBeDefined();
    });

    it("should allow createParticle with deferred: false during world update by forcing deferral", () => {
        const mockSystem = new class extends System {
            update(w: World) {
                createParticle({
                    world: w,
                    x: 100,
                    y: 100,
                    dx: 10,
                    dy: 10,
                    color: "white",
                    deferred: false // Explicitly false, but should be ignored if world.isUpdating
                });
            }
        };

        world.addSystem(mockSystem);

        expect(() => world.update(16.66)).not.toThrow();

        const entities = world.query("Render");
        const particle = entities.find(e => (world.getComponent(e, "Render") as any).shape === "particle");
        expect(particle).toBeDefined();
    });
});
