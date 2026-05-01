import { ClientAckTracker } from "../ClientAckTracker";

describe("ClientAckTracker", () => {
  let tracker: ClientAckTracker;

  beforeEach(() => {
    tracker = new ClientAckTracker();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("should track sequence numbers", () => {
    expect(tracker.nextSequence("c1")).toBe(1);
    expect(tracker.nextSequence("c1")).toBe(2);
    expect(tracker.nextSequence("c2")).toBe(1);
  });

  test("should record ACKs and calculate idle time", () => {
    tracker.nextSequence("c1");
    tracker.recordAck("c1", 1, 100);

    expect(tracker.getLastAckedSequence("c1")).toBe(1);
    expect(tracker.getLastAckedTick("c1")).toBe(100);

    jest.advanceTimersByTime(2000);
    expect(tracker.getIdleTime("c1")).toBe(2000);
  });

  test("should handle reset", () => {
    tracker.recordAck("c1", 1, 100);
    tracker.resetClient("c1");
    expect(tracker.getLastAckedSequence("c1")).toBe(0);
    expect(tracker.getIdleTime("c1")).toBe(0);
  });
});
