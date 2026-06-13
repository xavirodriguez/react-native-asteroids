import { World, BlueprintRegistry, CoreComponentRegistry, BlueprintDefinition } from "../src";

describe("Blueprints", () => {
  it("should spawn entities from blueprints", () => {
    const world = new World<CoreComponentRegistry>();
    const registry = new BlueprintRegistry<CoreComponentRegistry>();

    const asteroidBlueprint: BlueprintDefinition<CoreComponentRegistry, { size: number }> = {
      spawn: (world, entity, args) => {
        world.addComponent(entity, {
          type: "Transform",
          x: 0, y: 0, rotation: 0, scaleX: args.size, scaleY: args.size,
          worldX: 0, worldY: 0, worldRotation: 0, worldScaleX: args.size, worldScaleY: args.size,
          dirty: false
        });
      }
    };

    registry.register("asteroid", asteroidBlueprint);
    world.setResource("BlueprintRegistry", registry);

    const commands = world.getCommandBuffer();
    // @ts-ignore - for simplicity in test setup without full registry type
    commands.spawnFromBlueprint("asteroid", { size: 2 });

    world.flush();

    const entities = world.query("Transform");
    expect(entities.length).toBe(1);
    expect(world.getComponent(entities[0], "Transform")?.scaleX).toBe(2);
  });
});
