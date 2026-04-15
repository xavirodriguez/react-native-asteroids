import { InputSystem } from "../InputSystem";
import { TouchPoint } from "../InputTypes";

describe("InputSystem", () => {
  let inputSystem: InputSystem;

  beforeEach(() => {
    inputSystem = new InputSystem();
  });

  it("should detect a tap gesture", () => {
    const begin: TouchPoint = { id: 1, x: 10, y: 10, phase: 'began', timestamp: 100 };
    const end: TouchPoint = { id: 1, x: 12, y: 12, phase: 'ended', timestamp: 200 };

    inputSystem.onTouchEvent([begin]);
    inputSystem.onTouchEvent([end]);

    const gestures = inputSystem.consumeGestures();
    expect(gestures.length).toBe(1);
    expect(gestures[0].type).toBe('tap');
  });

  it("should detect a swipe gesture", () => {
    const begin: TouchPoint = { id: 1, x: 10, y: 10, phase: 'began', timestamp: 100 };
    const end: TouchPoint = { id: 1, x: 100, y: 10, phase: 'ended', timestamp: 200 };

    inputSystem.onTouchEvent([begin]);
    inputSystem.onTouchEvent([end]);

    const gestures = inputSystem.consumeGestures();
    expect(gestures.length).toBe(1);
    expect(gestures[0].type).toBe('swipe');
    expect(gestures[0].direction?.x).toBeCloseTo(1);
    expect(gestures[0].direction?.y).toBeCloseTo(0);
  });

  it("should consume gestures and empty the buffer", () => {
    const begin: TouchPoint = { id: 1, x: 10, y: 10, phase: 'began', timestamp: 100 };
    const end: TouchPoint = { id: 1, x: 12, y: 12, phase: 'ended', timestamp: 200 };

    inputSystem.onTouchEvent([begin, end]);

    expect(inputSystem.consumeGestures().length).toBe(1);
    expect(inputSystem.consumeGestures().length).toBe(0);
  });

  it("should track multiple touches", () => {
    const t1: TouchPoint = { id: 1, x: 10, y: 10, phase: 'began', timestamp: 100 };
    const t2: TouchPoint = { id: 2, x: 50, y: 50, phase: 'began', timestamp: 100 };

    inputSystem.onTouchEvent([t1, t2]);
    expect(inputSystem.isPressed(1)).toBe(true);
    expect(inputSystem.isPressed(2)).toBe(true);
    expect(inputSystem.getPosition(1)).toEqual({ x: 10, y: 10 });
    expect(inputSystem.getPosition(2)).toEqual({ x: 50, y: 50 });
  });
});
