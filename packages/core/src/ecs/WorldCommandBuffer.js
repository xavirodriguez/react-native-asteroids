"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorldCommandBuffer = void 0;
/**
 * Buffer for deferring world modifications until the end of an update cycle.
 *
 * @remarks
 * Using the command buffer is the recommended way to modify the world
 * (e.g., spawning/removing entities, adding/removing components) from within systems.
 *
 * This approach is designed to help maintain a stable world state throughout the frame's update
 * phases and helps minimize issues like iterator invalidation or inconsistent
 * query results caused by mid-frame structural changes.
 *
 * @warning
 * **Deferred execution**: Commands are not executed immediately. Changes will only
 * be reflected in the world state after {@link WorldCommandBuffer.flush} is
 * called (typically at the end of the {@link World.update} cycle).
 */
class WorldCommandBuffer {
    commands = [];
    /**
     * Schedules an entity to be spawned from a blueprint.
     */
    spawnFromBlueprint(blueprintId, args) {
        this.commands.push({
            execute: (world) => {
                const entity = world.createEntity();
                const registry = world.getResource("BlueprintRegistry");
                const blueprint = registry?.get(blueprintId);
                if (blueprint) {
                    blueprint.spawn(world, entity, args);
                }
            }
        });
    }
    addComponent(entity, component) {
        this.commands.push({
            execute: (world) => world.addComponent(entity, component)
        });
    }
    removeComponent(entity, type) {
        this.commands.push({
            execute: (world) => world.removeComponent(entity, type)
        });
    }
    removeEntity(entity) {
        this.commands.push({
            execute: (world) => world.removeEntity(entity)
        });
    }
    /**
     * Executes all buffered commands on the provided world.
     */
    flush(world) {
        const commands = [...this.commands];
        this.commands = [];
        for (const command of commands) {
            command.execute(world);
        }
    }
    /**
     * @deprecated
     * Directly creating entities via the command buffer is not supported as it
     * cannot return a valid entity ID immediately.
     * Use {@link WorldCommandBuffer.spawnFromBlueprint} for deferred spawning, or create entities directly in the world
     * if the ID is needed immediately.
     */
    createEntity() {
        console.warn("WorldCommandBuffer.createEntity() is not recommended. Use spawnFromBlueprint if possible.");
        return -1;
    }
}
exports.WorldCommandBuffer = WorldCommandBuffer;
