import { UnifiedInputSystem } from "../UnifiedInputSystem";
import { World } from "../../core/World";
import { InputStateComponent } from "../../types/EngineTypes";

describe("UnifiedInputSystem Overrides", () => {
  let inputSystem: UnifiedInputSystem;
  let world: World;

  beforeEach(() => {
    // Mock window to prevent errors during UnifiedInputSystem instantiation
    const mockWindow = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    (global as unknown as { window: unknown }).window = mockWindow;
    inputSystem = new UnifiedInputSystem();
    world = new World();
  });

  afterEach(() => {
    delete (global as unknown as { window: unknown }).window;
  });

  it("should incorporate overrides into getInputState with OR semantics", () => {
    inputSystem.bind("shoot", ["Space"]);

    // Simulate hardware key press
    const internalInput = inputSystem as unknown as { activeKeys: Set<string> };
    internalInput.activeKeys.add("Space");

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
    expect(state.actions).toContain("shoot");

    // clearOverride returns control to hardware
    inputSystem.clearOverride("jump");
    state = inputSystem.getInputState();
    expect(state.actions).not.toContain("jump");
    expect(state.actions).toContain("shoot");
  });

  it("should handle axis overrides", () => {
    inputSystem.bindAxis("horizontal", ["ArrowRight"], ["ArrowLeft"]);
    const internalInput = inputSystem as unknown as { activeKeys: Set<string> };
    internalInput.activeKeys.add("ArrowRight");

    // Hardware only
    let state = inputSystem.getInputState();
    expect(state.axes["horizontal"]).toBe(1);

    // Override axis
    inputSystem.setAxisOverride("horizontal", -0.5);
    state = inputSystem.getInputState();
    expect(state.axes["horizontal"]).toBe(-0.5);

    // Clear axis override
    inputSystem.clearAxisOverride("horizontal");
    state = inputSystem.getInputState();
    expect(state.axes["horizontal"]).toBe(1);
  });

  it("should be consistent between update() and getInputState()", () => {
    inputSystem.bind("shoot", ["Space"]);
    inputSystem.bindAxis("horizontal", ["ArrowRight"], ["ArrowLeft"]);

    const internalInput = inputSystem as unknown as {
        activeKeys: Set<string>;
        setOverride: (action: string, value: boolean) => void;
        setAxisOverride: (axis: string, value: number) => void;
    };
    internalInput.activeKeys.add("Space");
    internalInput.activeKeys.add("ArrowRight");
    inputSystem.setOverride("jump", true);
    inputSystem.setAxisOverride("vertical", 1);

    // Run update to sync with World
    inputSystem.update(world, 16);
    const inputComponent = world.getSingleton<InputStateComponent>("InputState")!;
    const snapshot = inputSystem.getInputState();

    // Check actions consistency
    expect(snapshot.actions).toContain("shoot");
    expect(snapshot.actions).toContain("jump");
    expect(inputComponent.actions.get("shoot")).toBe(true);
    expect(inputComponent.actions.get("jump")).toBe(true);

    // Check axes consistency
    expect(snapshot.axes["horizontal"]).toBe(1);
    expect(snapshot.axes["vertical"]).toBe(1);
    expect(inputComponent.axes.get("horizontal")).toBe(1);
    expect(inputComponent.axes.get("vertical")).toBe(1);
  });

  it("should include activeTouches in axes calculation", () => {
    inputSystem.bindAxis("fire", ["TouchTap"], []);
    const internalInput = inputSystem as unknown as { activeTouches: Set<string> };
    internalInput.activeTouches.add("TouchTap");

    const snapshot = inputSystem.getInputState();
    expect(snapshot.axes["fire"]).toBe(1);

    inputSystem.update(world, 16);
    const inputComponent = world.getSingleton<InputStateComponent>("InputState")!;
    expect(inputComponent.axes.get("fire")).toBe(1);
  });

  it("should sort actions alphabetically in getInputState", () => {
    inputSystem.setOverride("zebra", true);
    inputSystem.setOverride("apple", true);
    inputSystem.setOverride("middle", true);

    const state = inputSystem.getInputState();
    expect(state.actions).toEqual(["apple", "middle", "zebra"]);
  });
});
