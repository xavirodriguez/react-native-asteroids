import { World } from "../../core/World";
import { JoystickSystem } from "../JoystickSystem";
import {
  VirtualJoystickComponent,
  InputStateComponent,
} from "../../core/CoreComponents";

describe("JoystickSystem", () => {
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

  it("should update InputState axes based on joystick displacement", () => {
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

  it("should handle squared curve type", () => {
    const joystickEntity = world.createEntity();
    world.addComponent(joystickEntity, {
      type: "VirtualJoystick",
      active: true,
      originX: 100,
      originY: 100,
      currentX: 140,
      currentY: 100,
      radius: 40,
      deadzone: 0,
      sensitivity: 1.0,
      curveType: "squared",
      horizontalAxis: "horiz",
      verticalAxis: "vert",
    } as VirtualJoystickComponent);

    system.update(world, 16.66);

    const inputState = world.getSingleton<InputStateComponent>("InputState")!;
    // dx = 40, radius = 40 => nx = 1.0
    // squared: 1.0 * 1.0 = 1.0
    expect(inputState.axes.get("horiz")).toBe(1.0);
  });

  it("should respect deadzone", () => {
    const joystickEntity = world.createEntity();
    world.addComponent(joystickEntity, {
      type: "VirtualJoystick",
      active: true,
      originX: 100,
      originY: 100,
      currentX: 102,
      currentY: 100,
      radius: 40,
      deadzone: 0.2,
      sensitivity: 1.0,
      curveType: "linear",
      horizontalAxis: "horiz",
      verticalAxis: "vert",
    } as VirtualJoystickComponent);

    system.update(world, 16.66);

    const inputState = world.getSingleton<InputStateComponent>("InputState")!;
    // dx = 2, radius = 40 => nx = 0.05. 0.05 < 0.2 deadzone.
    expect(inputState.axes.get("horiz")).toBe(0);
  });

  it("should clear axes when inactive", () => {
    const joystickEntity = world.createEntity();
    world.addComponent(joystickEntity, {
      type: "VirtualJoystick",
      active: false,
      horizontalAxis: "horiz",
      verticalAxis: "vert",
    } as VirtualJoystickComponent);

    // Manually set some axis value first
    world.mutateSingleton<InputStateComponent>("InputState", s => s.axes.set("horiz", 0.5));

    system.update(world, 16.66);

    const inputState = world.getSingleton<InputStateComponent>("InputState")!;
    expect(inputState.axes.get("horiz")).toBe(0);
  });
});
