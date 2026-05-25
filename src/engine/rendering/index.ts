/**
 * @packageDocumentation
 * Multi-backend rendering system for TinyAsterEngine.
 *
 * @remarks
 * Exposes core rendering interfaces and implementations for Canvas and Skia.
 *
 * API status: Public
 */

/** @public */
export * from './RenderTypes';
/** @public */
export { type Renderer, type ShapeDrawer, type EffectDrawer } from './Renderer';
/** @public */
export { CanvasRenderer } from './CanvasRenderer';
/** @public */
export { SkiaRenderer } from './SkiaRenderer';
/** @public */
export { RenderSnapshot } from './RenderSnapshot';
/** @public */
export { RenderCommandBuffer, type DrawCommand, type DrawCommandOptions, type CommandType } from './RenderCommandBuffer';
