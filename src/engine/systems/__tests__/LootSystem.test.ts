import { World } from "../../core/World";
import { LootSystem } from "../LootSystem";
import { EventBus } from "../../core/EventBus";
import { LootTableComponent, TransformComponent } from "../../core/CoreComponents";

describe("LootSystem", () => {
    let world: World;
    let eventBus: EventBus;
    let lootSystem: LootSystem;

    beforeEach(() => {
        world = new World();
        eventBus = new EventBus();
        world.setResource("EventBus", eventBus);
        lootSystem = new LootSystem();
    });

    it("should register listeners onRegister and handle entity:destroyed", () => {
        world.addSystem(lootSystem);

        const entity = world.createEntity();
        world.addComponent(entity, {
            type: "LootTable",
            drops: [{ type: "speed", chance: 1.0, config: { value: 2 } }]
        } as LootTableComponent);
        world.addComponent(entity, {
            type: "Transform",
            x: 100,
            y: 100,
            rotation: 0,
            scaleX: 1,
            scaleY: 1
        } as TransformComponent);

        // Emit event
        eventBus.emit("entity:destroyed", { entity, type: "Ship" });

        // World.flush is called at end of update or manually.
        // handleEntityDestruction calls spawnPowerUp which uses command buffer.
        world.flush();

        const powerUps = world.query("PowerUp");
        expect(powerUps.length).toBe(1);
    });
});
