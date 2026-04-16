import { TouchController } from "../TouchController";

describe("TouchController Lifecycle", () => {
  it("should clear timeout on cleanup", () => {
    jest.useFakeTimers();
    const controller = new TouchController<any>();
    const setInputsSpy = jest.spyOn(controller as any, 'setInputs');

    // Trigger a gesture that sets a timeout
    (controller as any).emitGesture("tap");
    expect(setInputsSpy).toHaveBeenCalledWith({ tap: true });

    // Cleanup before timeout fires
    controller.cleanup();

    jest.advanceTimersByTime(100);

    // Should NOT have been called with tap: false because it was cleaned up
    // Wait, let's check the implementation.
    // My implementation: if (this.gestureTimeout) clearTimeout(this.gestureTimeout);
    // So it should NOT fire.

    // Check how many times setInputs was called. Once for true, zero for false.
    expect(setInputsSpy).toHaveBeenCalledTimes(1);
    expect(setInputsSpy).not.toHaveBeenCalledWith({ tap: false });

    jest.useRealTimers();
  });
});
