import { InputStateComponent, InputAction } from "../ecs/CoreComponents";

export const InputUtils = {
  isPressed(inputState: InputStateComponent, action: InputAction): boolean {
    return inputState.actions.get(action) || false;
  },
  getAxis(inputState: InputStateComponent, axis: string): number {
    return inputState.axes.get(axis) || 0;
  }
};
