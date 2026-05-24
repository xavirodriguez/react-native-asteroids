import { World } from "../../engine/core/World";
import { EnemyFactory } from "../EnemyFactory";
import { EnemyBlueprints } from "../../data/blueprints/EnemyBlueprints";
import {
    TransformComponent,
    VelocityComponent,
    RenderComponent,
    Collider2DComponent,
    HealthComponent
} from "../../engine/core/CoreComponents";
import { EnemyTagComponent } from "../../components/enemy/EnemyTagComponent";

describe("EnemyFactory", () => {
    let world: World;

    beforeEach(() => {
        world = new World();
    });

    it("should create an enemy from a blueprint", () => {
        const entity = EnemyFactory.createEnemy(world, "large_asteroid", 100, 200);

        const transform = world.getComponent<TransformComponent>(entity, "Transform");
        const render = world.getComponent<RenderComponent>(entity, "Render");
        const health = world.getComponent<HealthComponent>(entity, "Health");
        const enemyTag = world.getComponent<EnemyTagComponent>(entity, "EnemyTag");

        expect(transform?.x).toBe(100);
        expect(transform?.y).toBe(200);
        expect(render?.shape).toBe("polygon");
        expect(render?.size).toBe(30);
        expect(health?.max).toBe(1);
        expect(enemyTag?.blueprintId).toBe("large_asteroid");
        expect(enemyTag?.behavior).toBe("random_move");
    });

    it("should apply overrides when creating an enemy", () => {
        const entity = EnemyFactory.createEnemy(world, "ufo_scout", 50, 50, {
            health: 10,
            color: "red",
            behavior: "aggressive"
        });

        const render = world.getComponent<RenderComponent>(entity, "Render");
        const health = world.getComponent<HealthComponent>(entity, "Health");
        const enemyTag = world.getComponent<EnemyTagComponent>(entity, "EnemyTag");

        expect(render?.color).toBe("red");
        expect(health?.max).toBe(10);
        expect(health?.current).toBe(10);
        expect(enemyTag?.behavior).toBe("aggressive");
    });

    it("should create an entity deferred if world is updating", () => {
        let deferredEntity: number = -1;

        // Mock a system or use a direct update context
        world.addSystem({
            update: (w) => {
                deferredEntity = EnemyFactory.createEnemy(w, "small_asteroid", 0, 0);
            }
        });

        world.update(16);

        // In the same tick, the entity should be reserved but not fully built in the world until commands are flushed
        // Actually, World.update calls system.update, and then usually it flushes.
        // Let's verify it exists after update.
        expect(deferredEntity).not.toBe(-1);
        expect(world.getComponent(deferredEntity, "Transform")).toBeDefined();
        expect(world.getComponent<EnemyTagComponent>(deferredEntity, "EnemyTag")?.blueprintId).toBe("small_asteroid");
    });

    it("should throw error for invalid blueprint", () => {
        expect(() => {
            EnemyFactory.createEnemy(world, "non_existent", 0, 0);
        }).toThrow();
    });
});
