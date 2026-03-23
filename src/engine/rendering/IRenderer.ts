/**
 * Drawing command types for the renderer.
 */
export type DrawCommand =
  | { type: "circle"; x: number; y: number; radius: number; color: string; fill?: boolean }
  | { type: "rect"; x: number; y: number; width: number; height: number; color: string; fill?: boolean }
  | { type: "line"; x1: number; y1: number; x2: number; y2: number; color: string; width: number }
  | { type: "polygon"; points: { x: number; y: number }[]; color: string; fill?: boolean; rotation?: number; x: number; y: number }
  | { type: "text"; x: number; y: number; text: string; color: string; fontSize: number }
  | { type: "clear" };

/**
 * Abstract interface for all game renderers.
 * This allows the engine to support Canvas 2D, Skia, or WebGL interchangeably.
 */
export interface IRenderer {
  /**
   * Clears the current drawing surface.
   */
  clear(): void;

  /**
   * Draws a circle at the specified position.
   */
  drawCircle(x: number, y: number, radius: number, color: string, fill?: boolean): void;

  /**
   * Draws a rectangle at the specified position.
   */
  drawRect(x: number, y: number, width: number, height: number, color: string, fill?: boolean): void;

  /**
   * Draws a line between two points.
   */
  drawLine(x1: number, y1: number, x2: number, y2: number, color: string, width: number): void;

  /**
   * Draws a polygon at the specified position.
   */
  drawPolygon(x: number, y: number, points: { x: number; y: number }[], color: string, fill?: boolean, rotation?: number): void;

  /**
   * Draws text at the specified position.
   */
  drawText(x: number, y: number, text: string, color: string, fontSize: number): void;

  /**
   * Resizes the viewport.
   */
  resize(width: number, height: number): void;

  /**
   * Returns all pending drawing commands for the current frame.
   * Useful for bridge components that translate these commands into SVG or other formats.
   */
  getCommands(): DrawCommand[];
}
