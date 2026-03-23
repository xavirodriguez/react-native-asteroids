import { IRenderer, DrawCommand } from "./IRenderer";

/**
 * A renderer implementation that buffers drawing commands.
 * These commands can then be consumed by a React component to render via Canvas or SVG.
 */
export class CanvasRenderer implements IRenderer {
  private commands: DrawCommand[] = [];
  private width: number = 800;
  private height: number = 600;

  public clear(): void {
    this.commands = [];
    this.commands.push({ type: "clear" });
  }

  public drawCircle(x: number, y: number, radius: number, color: string, fill?: boolean): void {
    this.commands.push({ type: "circle", x, y, radius, color, fill });
  }

  public drawRect(x: number, y: number, width: number, height: number, color: string, fill?: boolean): void {
    this.commands.push({ type: "rect", x, y, width, height, color, fill });
  }

  public drawLine(x1: number, y1: number, x2: number, y2: number, color: string, width: number): void {
    this.commands.push({ type: "line", x1, y1, x2, y2, color, width });
  }

  public drawPolygon(x: number, y: number, points: { x: number; y: number }[], color: string, fill?: boolean, rotation?: number): void {
    this.commands.push({ type: "polygon", x, y, points, color, fill, rotation });
  }

  public drawText(x: number, y: number, text: string, color: string, fontSize: number): void {
    this.commands.push({ type: "text", x, y, text, color, fontSize });
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  public getCommands(): DrawCommand[] {
    return this.commands;
  }
}
