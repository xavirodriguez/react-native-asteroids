import { RenderCommand } from "./RenderTypes";

/** @public */
export class RenderCommandBufferImpl {
  private commands: RenderCommand[] = [];
  push(command: RenderCommand) { this.commands.push(command); }
  clear() { this.commands = []; }
  getCommands() { return this.commands; }
}
