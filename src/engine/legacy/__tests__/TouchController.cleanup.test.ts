import { TouchController } from "../TouchController";

describe("TouchController Cleanup", () => {
  it("should cancel pending timeouts on cleanup", () => {
    jest.useFakeTimers();
    const controller = new TouchController<unknown>();

    // Simulate a tap gesture which triggers a timeout in emitGesture
    controller.onTouchStart(0, 0);
    controller.onTouchEnd(0, 0);

    // Verify timeout is scheduled (internally via setTimeout)
    expect(jest.getTimerCount()).toBe(1);

    controller.cleanup();

    // Verify timeout is cleared
    expect(jest.getTimerCount()).toBe(0);

    jest.useRealTimers();
  });
});
