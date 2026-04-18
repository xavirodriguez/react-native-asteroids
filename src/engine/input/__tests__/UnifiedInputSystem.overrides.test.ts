import { UnifiedInputSystem } from "../UnifiedInputSystem";

describe("UnifiedInputSystem Overrides", () => {
  let inputSystem: UnifiedInputSystem;

  beforeEach(() => {
    // Mock window to prevent errors during UnifiedInputSystem instantiation
    global.window = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    } as any;
    inputSystem = new UnifiedInputSystem();
  });

  afterEach(() => {
    delete (global as any).window;
  });

  it("should incorporate overrides into getInputState", () => {
    inputSystem.bind("shoot", ["Space"]);

    // Simulate hardware key press (internal state manipulation for testing)
    (inputSystem as any).activeKeys.add("Space");

    // Initial state: hardware only
    let state = inputSystem.getInputState();
    expect(state.actions).toContain("shoot");

    // Override to false (matching update() OR logic: hardware=true OR override=false => true)
    inputSystem.setOverride("shoot", false);
    state = inputSystem.getInputState();
    expect(state.actions).toContain("shoot");

    // Override to true (logical activation)
    inputSystem.setOverride("jump", true);
    state = inputSystem.getInputState();
    expect(state.actions).toContain("jump");
    expect(state.actions).toContain("shoot"); // Shoot is still pressed on hardware

    // Remove override
    inputSystem.setOverride("jump", undefined as any); // Removing by setting to undefined
    state = inputSystem.getInputState();
    // Hardware space is still pressed
    inputSystem.setOverride("shoot", undefined as any);
    state = inputSystem.getInputState();
    expect(state.actions).toContain("shoot");
  });

  it("should sort actions alphabetically in getInputState", () => {
    inputSystem.setOverride("zebra", true);
    inputSystem.setOverride("apple", true);
    inputSystem.setOverride("middle", true);

    const state = inputSystem.getInputState();
    expect(state.actions).toEqual(["apple", "middle", "zebra"]);
  });

  it("should preserve hardware axis values", () => {
    inputSystem.bindAxis("horizontal", ["ArrowRight"], ["ArrowLeft"]);
    (inputSystem as any).activeKeys.add("ArrowRight");

    const state = inputSystem.getInputState();
    expect(state.axes["horizontal"]).toBe(1);
  });
});
