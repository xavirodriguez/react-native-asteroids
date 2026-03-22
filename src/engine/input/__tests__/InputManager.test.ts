import { InputManager } from "../InputManager";
import { InputController } from "../InputController";
import { type InputState } from "../../../types/GameTypes";

class MockController extends InputController {
  public setup = jest.fn();
  public cleanup = jest.fn();
  public setMockInputs(inputs: Partial<InputState>) {
    this.inputs = { ...this.inputs, ...inputs };
  }
}

describe("InputManager", () => {
  let manager: InputManager;
  let controller1: MockController;
  let controller2: MockController;

  beforeEach(() => {
    manager = new InputManager();
    controller1 = new MockController();
    controller2 = new MockController();
  });

  it("should setup controllers when added", () => {
    manager.addController(controller1);
    expect(controller1.setup).toHaveBeenCalled();
  });

  it("should cleanup controllers", () => {
    manager.addController(controller1);
    manager.cleanup();
    expect(controller1.cleanup).toHaveBeenCalled();
  });

  it("should aggregate inputs from multiple controllers", () => {
    manager.addController(controller1);
    manager.addController(controller2);

    controller1.setMockInputs({ thrust: true });
    controller2.setMockInputs({ shoot: true });

    const combined = manager.getCombinedInputs();
    expect(combined.thrust).toBe(true);
    expect(combined.shoot).toBe(true);
    expect(combined.rotateLeft).toBe(false);
    expect(combined.rotateRight).toBe(false);
  });

  it("should return false for all inputs when no controllers are registered", () => {
    const combined = manager.getCombinedInputs();
    expect(combined.thrust).toBe(false);
    expect(combined.rotateLeft).toBe(false);
    expect(combined.rotateRight).toBe(false);
    expect(combined.shoot).toBe(false);
  });

  it("should distribute manual inputs to all controllers via setInputs", () => {
    manager.addController(controller1);
    manager.addController(controller2);

    manager.setInputs({ thrust: true });

    expect(controller1.getCurrentInputs().thrust).toBe(true);
    expect(controller2.getCurrentInputs().thrust).toBe(true);
  });
});
