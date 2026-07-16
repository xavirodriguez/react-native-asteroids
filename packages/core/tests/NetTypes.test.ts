import { InputFrameSchema } from "../src/network/NetTypes";

describe("InputFrameSchema validation", () => {
  it("should successfully parse and validate a valid InputFrame", () => {
    const validFrame = {
      tick: 42,
      actions: ["shoot", "thrust"],
      axes: {
        horizontal: -0.5,
        vertical: 1.0
      }
    };

    const parsed = InputFrameSchema.parse(validFrame);
    expect(parsed.tick).toBe(42);
    expect(parsed.actions).toContain("shoot");
    expect(parsed.axes.horizontal).toBe(-0.5);
  });

  it("should throw an error if tick is negative", () => {
    const invalidFrame = {
      tick: -1, // invalid negative tick
      actions: [],
      axes: {}
    };

    expect(() => {
      InputFrameSchema.parse(invalidFrame);
    }).toThrow();
  });

  it("should throw an error if actions is not an array of strings", () => {
    const invalidFrame = {
      tick: 10,
      actions: [123], // should be string array
      axes: {}
    };

    expect(() => {
      InputFrameSchema.parse(invalidFrame);
    }).toThrow();
  });

  it("should throw an error if axes contains non-numeric values", () => {
    const invalidFrame = {
      tick: 10,
      actions: [],
      axes: {
        horizontal: "left" // should be number
      }
    };

    expect(() => {
      InputFrameSchema.parse(invalidFrame);
    }).toThrow();
  });
});
