import { Entity } from "../core/Entity";

/**
 * Captured transform state of an entity ready for rendering.
 *
 * @public
 */
export interface TransformSnapshot {
  /** [px] World X coordinate. */
  x: number;
  /** [px] World Y coordinate. */
  y: number;
  /** [rad] Absolute rotation. */
  rotation: number;
  /** Horizontal scale multiplier. */
  scaleX: number;
  /** Vertical scale multiplier. */
  scaleY: number;
}

/**
 * Drawing command emitted by the Render System for backend consumption.
 *
 * @remarks
 * Represents a platform-agnostic drawing operation.
 *
 * @conceptualRisk [ALLOCATION_FREE][HIGH] Implementation should ideally use
 * object pooling to minimize GC pressure during the render loop.
 *
 * @public
 */
export interface RenderCommand {
  /** Discriminator for the drawer type (e.g., "sprite", "circle"). */
  type: string;
  /** Source entity ID. */
  entityId: Entity;
  /** Pre-interpolated visual transform. */
  worldTransform: TransformSnapshot;
  /** [0, 1] Alpha factor used during the capture for this command. */
  alpha: number;
  textureId?: string;
  width?: number;
  height?: number;
  radius?: number;
  color?: string;
  /** Layering order. Higher values are drawn later (on top). */
  zIndex: number;
  visible: boolean;
}

/**
 * Low-level Rendering Adapter interface.
 * Implemented by specific backends like Skia, Canvas, or WebGL.
 *
 * @responsibility Prepare the canvas for a new frame.
 * @responsibility Process individual drawing commands efficiently.
 * @responsibility Finalize the frame and present visual results.
 *
 * @public
 */
export interface Renderer {
  /**
   * Begins a new rendering cycle.
   * @param alpha - [0, 1] Interpolation factor for smooth motion.
   */
  beginFrame(alpha: number): void;

  /**
   * Submits a drawing command to the backend.
   * @param command - The command data.
   */
  submit(command: RenderCommand): void;

  /**
   * Finalizes the current frame and flushes buffers.
   */
  endFrame(): void;
}
