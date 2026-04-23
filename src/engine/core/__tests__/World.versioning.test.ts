import { World } from "../World";

describe("World Versioning (Semantic Split)", () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  it("should increment structureVersion only on structural changes", () => {
    const initialStructure = world.structureVersion;
    const initialState = world.stateVersion;

    world.createEntity();
    expect(world.structureVersion).toBe(initialStructure + 1);
    expect(world.stateVersion).toBe(initialState);

    world.addComponent(1, { type: "NewComponent" });
    expect(world.structureVersion).toBe(initialStructure + 2);
    expect(world.stateVersion).toBe(initialState);

    world.removeComponent(1, "NewComponent");
    expect(world.structureVersion).toBe(initialStructure + 3);
    expect(world.stateVersion).toBe(initialState);

    world.removeEntity(1);
    expect(world.structureVersion).toBe(initialStructure + 4);
    expect(world.stateVersion).toBe(initialState);
  });

  it("should increment stateVersion only on component updates or manual notification", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Test", value: 1 });

    const initialStructure = world.structureVersion;
    const initialState = world.stateVersion;

    // Updating existing component
    world.addComponent(entity, { type: "Test", value: 2 });
    expect(world.structureVersion).toBe(initialStructure);
    expect(world.stateVersion).toBe(initialState + 1);

    // Manual notification
    world.notifyStateChange();
    expect(world.structureVersion).toBe(initialStructure);
    expect(world.stateVersion).toBe(initialState + 2);
  });

  it("should track renderDirty status", () => {
    expect(world.isRenderDirty()).toBe(false);
    world.notifyStateChange();
    expect(world.isRenderDirty()).toBe(true);
    world.setRenderDirty(false);
    expect(world.isRenderDirty()).toBe(false);
  });

  it("should increment tick on update", () => {
    expect(world.tick).toBe(0);
    world.update(16);
    expect(world.tick).toBe(1);
    world.update(16);
    expect(world.tick).toBe(2);
  });

  it("should provide a deprecated version getter for compatibility", () => {
    const initialVersion = world.version;
    world.createEntity();
    expect(world.version).toBe(initialVersion + 1);
    world.notifyStateChange();
    expect(world.version).toBe(initialVersion + 2);
  });

  it("should NOT increment any version on pure reads including getSingleton", () => {
    const entity = world.createEntity();
    const comp = { type: "Singleton" };
    Object.freeze(comp);
    world.addComponent(entity, comp);

    const initialStructure = world.structureVersion;
    const initialState = world.stateVersion;

    // Pure read
    const retrieved = world.getComponent(entity, "Singleton");
    expect(retrieved).toBe(comp);
    expect(world.structureVersion).toBe(initialStructure);
    expect(world.stateVersion).toBe(initialState);

    // Singleton read (used to have side-effect if frozen)
    const singleton = world.getSingleton("Singleton");
    expect(singleton).toBe(comp);
    expect(world.structureVersion).toBe(initialStructure);
    expect(world.stateVersion).toBe(initialState);
  });

  it("should restore both versions from snapshot", () => {
    world.createEntity();
    world.notifyStateChange();

    const snapshot = world.snapshot();
    expect(snapshot.structureVersion).toBe(world.structureVersion);
    expect(snapshot.stateVersion).toBe(world.stateVersion);

    const newWorld = new World();
    newWorld.restore(snapshot);
    expect(newWorld.structureVersion).toBe(world.structureVersion);
    expect(newWorld.stateVersion).toBe(world.stateVersion);
  });
});
