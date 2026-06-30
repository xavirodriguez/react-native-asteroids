"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RenderCommandBufferImpl = void 0;
class RenderCommandBufferImpl {
    commands = [];
    push(command) { this.commands.push(command); }
    clear() { this.commands = []; }
    getCommands() { return this.commands; }
}
exports.RenderCommandBufferImpl = RenderCommandBufferImpl;
