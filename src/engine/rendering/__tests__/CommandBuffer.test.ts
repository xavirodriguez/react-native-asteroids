import { CommandBuffer } from "../CommandBuffer";
import { Entity } from "../../core/Entity";

describe("CommandBuffer", () => {
  it("should add and retrieve commands correctly", () => {
    const buffer = new CommandBuffer(10);
    buffer.addCommand({
      type: "test",
      x: 10,
      y: 20,
      rotation: 0.5,
      scaleX: 2,
      scaleY: 2,
      opacity: 0.8,
      color: "red",
      size: 5,
      zIndex: 1,
      entityId: 1 as Entity
    });

    expect(buffer.getCount()).toBe(1);
    const cmd = buffer.getCommands()[0];
    expect(cmd.type).toBe("test");
    expect(cmd.x).toBe(10);
    expect(cmd.y).toBe(20);
    expect(cmd.rotation).toBe(0.5);
    expect(cmd.zIndex).toBe(1);
  });

  it("should sort commands by zIndex", () => {
    const buffer = new CommandBuffer(10);
    buffer.addCommand({ type: "high", x: 0, y: 0, zIndex: 10, entityId: 1 as Entity });
    buffer.addCommand({ type: "low", x: 0, y: 0, zIndex: 1, entityId: 2 as Entity });

    buffer.sort();

    const cmds = buffer.getCommands();
    expect(cmds[0].type).toBe("low");
    expect(cmds[1].type).toBe("high");
  });
});
