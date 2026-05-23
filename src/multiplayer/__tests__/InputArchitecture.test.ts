import { InputRingBuffer } from "../InputRingBuffer";
import { InputSerializer } from "../InputSerializer";
import { RemoteInputPredictor } from "../RemoteInputPredictor";
import { InputFrame } from "../NetTypes";

describe("Multiplayer Input Architecture", () => {
  describe("InputRingBuffer", () => {
    it("should store and retrieve frames by tick", () => {
      const buffer = new InputRingBuffer(10);
      const frame: InputFrame = {
        protocolVersion: 1,
        tick: 5,
        timestamp: 100,
        actions: ["shoot"],
        axes: { horizontal: 1 }
      };

      buffer.set(frame);
      expect(buffer.get(5)).toEqual(frame);
      expect(buffer.get(4)).toBeUndefined();
    });

    it("should handle circular wrapping correctly", () => {
      const buffer = new InputRingBuffer(4);
      const frame1: InputFrame = { protocolVersion: 1, tick: 0, timestamp: 0, actions: [], axes: {} };
      const frame2: InputFrame = { protocolVersion: 1, tick: 4, timestamp: 0, actions: ["jump"], axes: {} };

      buffer.set(frame1);
      expect(buffer.get(0)).toEqual(frame1);

      buffer.set(frame2);
      // frame2 should overwrite index 0 (4 % 4 = 0), but it's for tick 4
      expect(buffer.get(4)).toEqual(frame2);
      // tick 0 should now be undefined because index 0 holds tick 4
      expect(buffer.get(0)).toBeUndefined();
    });
  });

  describe("InputSerializer", () => {
    it("should pack historical frames for redundancy", () => {
      const buffer = new InputRingBuffer(10);
      for (let i = 0; i < 5; i++) {
        buffer.set({ protocolVersion: 1, tick: i, timestamp: i, actions: [], axes: {} });
      }

      const payload = InputSerializer.pack(buffer, 4, 3, "player-1");
      expect(payload.latestTick).toBe(4);
      expect(payload.frames.length).toBe(3);
      expect(payload.frames[0].tick).toBe(4);
      expect(payload.frames[2].tick).toBe(2);
    });

    it("should unpack frames into a target buffer", () => {
      const target = new InputRingBuffer(10);
      const frames: InputFrame[] = [
        { protocolVersion: 1, tick: 10, timestamp: 0, actions: ["fire"], axes: {} },
        { protocolVersion: 1, tick: 9, timestamp: 0, actions: [], axes: {} }
      ];

      InputSerializer.unpack({ latestTick: 10, frames, sessionId: "remote" }, target);
      expect(target.get(10)?.actions).toContain("fire");
      expect(target.get(9)).toBeDefined();
    });
  });

  describe("RemoteInputPredictor", () => {
    it("should predict based on last known frame", () => {
      const buffer = new InputRingBuffer(10);
      buffer.set({ protocolVersion: 1, tick: 10, timestamp: 0, actions: ["move_right"], axes: {} });

      const predicted = RemoteInputPredictor.predictNext(buffer, 11);
      expect(predicted.tick).toBe(11);
      expect(predicted.actions).toContain("move_right");
    });

    it("should return neutral frame if no history exists", () => {
        const buffer = new InputRingBuffer(10);
        const predicted = RemoteInputPredictor.predictNext(buffer, 100);
        expect(predicted.actions).toEqual([]);
        expect(Object.keys(predicted.axes).length).toBe(0);
    });
  });
});
