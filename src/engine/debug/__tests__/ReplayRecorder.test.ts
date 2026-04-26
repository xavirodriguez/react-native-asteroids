import { ReplayRecorder } from "../ReplayRecorder";

describe("ReplayRecorder startTick accuracy", () => {
  it("should return correct startTick when no frames are dropped", () => {
    const recorder = new ReplayRecorder();
    recorder.startRecording();
    recorder.recordTick(10, {});
    recorder.recordTick(11, {});

    const data = recorder.stopRecording();
    expect(data.startTick).toBe(10);
    expect(data.endTick).toBe(11);
  });

  it("should return correct startTick after frames are dropped by circular buffer", () => {
    const recorder = new ReplayRecorder();
    // Using a smaller MAX_FRAMES for testing if possible, but it's private.
    // We'll just push enough frames to exceed the default MAX_FRAMES (18000).
    recorder.startRecording();

    const MAX_FRAMES = 18000;
    for (let i = 0; i <= MAX_FRAMES; i++) {
        recorder.recordTick(i, {});
    }

    const data = recorder.stopRecording();
    // The first frame (tick 0) should have been shifted out.
    // frames.length is now MAX_FRAMES.
    // The first frame in the array should be tick 1.
    expect(data.frames.length).toBe(MAX_FRAMES);
    expect(data.frames[0].tick).toBe(1);
    expect(data.startTick).toBe(1);
    expect(data.endTick).toBe(MAX_FRAMES);
  });
});
