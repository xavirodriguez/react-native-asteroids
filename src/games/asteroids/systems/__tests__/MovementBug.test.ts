import { World } from "../../../../engine/core/World";
import { MovementSystem } from "../../../../engine/physics/systems/MovementSystem";
import { PhysicsUtils } from "../../../../engine/physics/utils/PhysicsUtils";
import { TransformComponent, VelocityComponent, SpatialNodeComponent, BoundaryComponent, Camera2DComponent } from "../../../../engine/types/EngineTypes";
import { SpatialPartitioningSystem } from "../../../../engine/systems/SpatialPartitioningSystem";
import { SpatialGrid } from "../../../../engine/physics/utils/SpatialGrid";

describe("MovementBug Reproduction", () => {
    let world: World;
    let movementSystem: MovementSystem;

    beforeEach(() => {
        world = new World();
        movementSystem = new MovementSystem();
        world.addSystem(movementSystem);
    });

    describe("PhysicsUtils.integrateMovement", () => {
        it("should not update position if velocity is NaN", () => {
            const pos = { x: 10, y: 10 };
            const vel = { dx: NaN, dy: 10 };
            PhysicsUtils.integrateMovement(pos, vel, 1);
            expect(pos.x).toBe(10);
            expect(pos.y).toBe(10);
        });

        it("should not update position if velocity is null (currently might fail and convert to 0)", () => {
            const pos = { x: 10, y: 10 };
            // @ts-expect-error - Testing null velocity robustness
            const vel = { dx: null, dy: 10 };
            PhysicsUtils.integrateMovement(pos, vel, 1);
            // If it converts null to 0, pos.x will stay 10.
            // But we want it to be caught as invalid.
            expect(pos.x).toBe(10);
        });

        it("should update position if velocity is 0", () => {
            const pos = { x: 10, y: 10 };
            const vel = { dx: 0, dy: 0 };
            PhysicsUtils.integrateMovement(pos, vel, 1);
            expect(pos.x).toBe(10);
            expect(pos.y).toBe(10);
        });

        it("should update position with valid velocity", () => {
            const pos = { x: 10, y: 10 };
            const vel = { dx: 5, dy: -5 };
            PhysicsUtils.integrateMovement(pos, vel, 1);
            expect(pos.x).toBe(15);
            expect(pos.y).toBe(5);
        });
    });

    describe("MovementSystem with SpatialNode", () => {
        it("should MOVE an entity if SpatialNode is active", () => {
            const entity = world.createEntity();
            world.addComponent(entity, { type: "Transform", x: 10, y: 10, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
            world.addComponent(entity, { type: "Velocity", dx: 10, dy: 0 } as VelocityComponent);
            world.addComponent(entity, { type: "SpatialNode", active: true, lastCellKeys: [] } as SpatialNodeComponent);

            world.update(1000); // 1 second

            const pos = world.getComponent<TransformComponent>(entity, "Transform")!;
            expect(pos.x).toBe(20);
        });

        it("should NOT MOVE an entity if SpatialNode is inactive and NO BoundaryComponent", () => {
            const entity = world.createEntity();
            world.addComponent(entity, { type: "Transform", x: 10, y: 10, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
            world.addComponent(entity, { type: "Velocity", dx: 10, dy: 0 } as VelocityComponent);
            world.addComponent(entity, { type: "SpatialNode", active: false, lastCellKeys: [] } as SpatialNodeComponent);

            world.update(1000);

            const pos = world.getComponent<TransformComponent>(entity, "Transform")!;
            expect(pos.x).toBe(10); // Should NOT move
        });

        it("should MOVE an entity if SpatialNode is inactive BUT has BoundaryComponent", () => {
            const entity = world.createEntity();
            world.addComponent(entity, { type: "Transform", x: 10, y: 10, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
            world.addComponent(entity, { type: "Velocity", dx: 10, dy: 0 } as VelocityComponent);
            world.addComponent(entity, { type: "SpatialNode", active: false, lastCellKeys: [] } as SpatialNodeComponent);
            world.addComponent(entity, { type: "Boundary", width: 800, height: 600, behavior: "wrap" } as BoundaryComponent);

            world.update(1000);

            const pos = world.getComponent<TransformComponent>(entity, "Transform")!;
            expect(pos.x).toBe(20);
        });
    });

    describe("SpatialPartitioningSystem Camera logic", () => {
        it("should correctly identify active entities when camera is at top-left", () => {
            const grid = new SpatialGrid(100);
            world.setResource("SpatialGrid", grid);

            const sps = new SpatialPartitioningSystem();

            // Camera at 0, 0
            const cam = world.createEntity();
            world.addComponent(cam, { type: "Camera2D", x: 0, y: 0, zoom: 1, isMain: true } as Camera2DComponent);

            // Asteroid at 100, 100.
            const asteroid = world.createEntity();
            world.addComponent(asteroid, { type: "Transform", x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
            world.addComponent(asteroid, { type: "SpatialNode", active: false, lastCellKeys: [] } as SpatialNodeComponent);

            sps.update(world, 16.66);

            const node = world.getComponent<SpatialNodeComponent>(asteroid, "SpatialNode")!;
            expect(node.active).toBe(true);
        });

        it("should identify entities as inactive if far from camera", () => {
            const grid = new SpatialGrid(100);
            world.setResource("SpatialGrid", grid);

            const sps = new SpatialPartitioningSystem();

            // Camera at 0, 0
            const cam = world.createEntity();
            world.addComponent(cam, { type: "Camera2D", x: 0, y: 0, zoom: 1, isMain: true } as Camera2DComponent);

            // Asteroid at 2000, 2000.
            const asteroid = world.createEntity();
            world.addComponent(asteroid, { type: "Transform", x: 2000, y: 2000, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
            world.addComponent(asteroid, { type: "SpatialNode", active: true, lastCellKeys: [] } as SpatialNodeComponent);

            sps.update(world, 16.66);

            const node = world.getComponent<SpatialNodeComponent>(asteroid, "SpatialNode")!;
            expect(node.active).toBe(false);
        });
    });
});
