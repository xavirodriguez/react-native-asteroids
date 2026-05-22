import { World } from "../../core/World";
import { JoystickSystem } from "../JoystickSystem";
import {
  VirtualJoystickComponent,
  InputStateComponent,
  ProcessedJoystickComponent,
  MoveCommand,
  RotateCommand,
} from "../../core/CoreComponents";

describe("JoystickSystem (Phase 2)", () => {
  let world: World;
  let system: JoystickSystem;

  beforeEach(() => {
    world = new World();
    system = new JoystickSystem();

    // Setup InputState singleton
    world.getCommandBuffer().createEntity((e) => {
      world.getCommandBuffer().addComponent(e, {
        type: "InputState",
        actions: new Map(),
        axes: new Map(),
      } as InputStateComponent);
    });
    world.flush();
  });

  it("should update InputState axes based on joystick displacement (legacy config)", () => {
    const joystickEntity = world.createEntity();
    world.addComponent(joystickEntity, {
      type: "VirtualJoystick",
      active: true,
      originX: 100,
      originY: 100,
      currentX: 120,
      currentY: 100,
      radius: 40,
      deadzone: 0.1,
      sensitivity: 1.0,
      curveType: "linear",
      horizontalAxis: "horiz",
      verticalAxis: "vert",
    } as VirtualJoystickComponent);

    system.update(world, 16.66);

    const inputState = world.getSingleton<InputStateComponent>("InputState")!;
    // dx = 20, radius = 40 => nx = 0.5
    // deadzone = 0.1. (0.5 - 0.1) / (1 - 0.1) = 0.4 / 0.9 = 0.444...
    expect(inputState.axes.get("horiz")).toBeCloseTo(0.444, 3);
    expect(inputState.axes.get("vert")).toBe(0);
  });

  it("should handle quadratic curve type using the new JoystickConfig", () => {
    const joystickEntity = world.createEntity();
    world.addComponent(joystickEntity, {
      type: "VirtualJoystick",
      active: true,
      originX: 100,
      originY: 100,
      currentX: 120,
      currentY: 100,
      radius: 40,
      horizontalAxis: "horiz",
      verticalAxis: "vert",
      config: {
        deadzone: 0,
        curveType: "quadratic",
        curveExponent: 2.0, // Easy to test: 0.5^2 = 0.25
        sensitivity: 1.0,
        normalizeOutput: false,
      }
    } as VirtualJoystickComponent);

    system.update(world, 16.66);

    const inputState = world.getSingleton<InputStateComponent>("InputState")!;
    // dx = 20, radius = 40 => nx = 0.5
    // quadratic: 0.5^2.0 = 0.25
    expect(inputState.axes.get("horiz")).toBe(0.25);
  });

  it("should respect radial deadzone", () => {
    const joystickEntity = world.createEntity();
    world.addComponent(joystickEntity, {
      type: "VirtualJoystick",
      active: true,
      originX: 100,
      originY: 100,
      currentX: 102,
      currentY: 100,
      radius: 40,
      horizontalAxis: "horiz",
      verticalAxis: "vert",
      config: {
        deadzone: 0.2, // dx=2 is nx=0.05, should be in deadzone
        curveType: "linear",
        curveExponent: 1.8,
        sensitivity: 1.0,
        normalizeOutput: true,
      }
    } as VirtualJoystickComponent);

    system.update(world, 16.66);
    world.flush();

    const processed = world.getComponent<ProcessedJoystickComponent>(joystickEntity, "ProcessedJoystick")!;
    expect(processed.inDeadzone).toBe(true);
    expect(processed.x).toBe(0);

    const inputState = world.getSingleton<InputStateComponent>("InputState")!;
    expect(inputState.axes.get("horiz")).toBe(0);
  });

  it("should generate MoveCommand for movement joysticks", () => {
    const joystickEntity = world.createEntity();
    world.addComponent(joystickEntity, {
      type: "VirtualJoystick",
      active: true,
      originX: 100,
      originY: 100,
      currentX: 140,
      currentY: 100,
      radius: 40,
      joystickType: "movement",
      horizontalAxis: "horiz",
      verticalAxis: "vert",
      config: {
        deadzone: 0,
        curveType: "linear",
        curveExponent: 1.8,
        sensitivity: 1.0,
        normalizeOutput: true,
      }
    } as VirtualJoystickComponent);

    system.update(world, 16.66);
    world.flush(); // Structural changes from system need flush

    const moveCmd = world.getComponent<MoveCommand>(joystickEntity, "MoveCommand");
    expect(moveCmd).toBeDefined();
    expect(moveCmd?.x).toBe(1.0);
  });

  it("should generate RotateCommand for rotation joysticks", () => {
    const joystickEntity = world.createEntity();
    world.addComponent(joystickEntity, {
      type: "VirtualJoystick",
      active: true,
      originX: 100,
      originY: 100,
      currentX: 120,
      currentY: 100,
      radius: 40,
      joystickType: "rotation",
      horizontalAxis: "horiz",
      verticalAxis: "vert",
      config: {
        deadzone: 0,
        curveType: "linear",
        curveExponent: 1.8,
        sensitivity: 1.0,
        normalizeOutput: true,
      }
    } as VirtualJoystickComponent);

    system.update(world, 16.66);
    world.flush();

    const rotateCmd = world.getComponent<RotateCommand>(joystickEntity, "RotateCommand");
    expect(rotateCmd).toBeDefined();
    expect(rotateCmd?.amount).toBe(0.5);
  });

  it("should clear commands and axes when inactive", () => {
    const joystickEntity = world.createEntity();
    world.addComponent(joystickEntity, {
      type: "VirtualJoystick",
      active: false,
      horizontalAxis: "horiz",
      verticalAxis: "vert",
    } as VirtualJoystickComponent);

    // Mock existing components/axes
    world.addComponent(joystickEntity, { type: "MoveCommand", x: 1, y: 0 } as MoveCommand);
    world.mutateSingleton<InputStateComponent>("InputState", s => s.axes.set("horiz", 0.5));

    system.update(world, 16.66);
    world.flush();

    const inputState = world.getSingleton<InputStateComponent>("InputState")!;
    expect(inputState.axes.get("horiz")).toBe(0);
    expect(world.hasComponent(joystickEntity, "MoveCommand")).toBe(false);
  });
});
