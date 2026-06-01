/**
 * Core rendering command definitions and buffering.
 *
 * This module defines the protocol for communicating between game systems
 * and platform-specific renderers (Canvas, Skia). It provides a command buffer
 * designed to help minimize object allocations during the render loop.
 *
 * @packageDocumentation
 */

import { Entity } from "../ecs/Entity";

/**
 * Discriminator for the type of drawing operation (e.g., "player", "particle").
 *
 * @public
 */
export type CommandType = string;

/**
 * An immutable-like representation of a single drawing operation.
 *
 * @public
 */
export interface DrawCommand {
  type: CommandType;
  /** [px] World X coordinate. */
  x: number;
  /** [px] World Y coordinate. */
  y: number;
  /** [rad] Rotation. */
  rotation: number;
  scaleX: number;
  scaleY: number;
  /** [0, 1] Visual transparency. */
  opacity: number;
  /** Color string (Hex/CSS). */
  color: string;
  /** [px] Primary dimension. */
  size: number;
  /** Custom vertices for polygons. */
  vertices: ReadonlyArray<{ readonly x: number; readonly y: number }> | null;
  /** White flash duration in frames. */
  hitFlashFrames: number;
  /** Sorting order. */
  zIndex: number;
  /** Owner entity ID. */
  entityId: Entity;
  /** Arbitrary metadata for the drawer. */
  data: Record<string, unknown> | null;
}

/**
 * Configuration options for adding a command to the buffer.
 *
 * @public
 */
export interface DrawCommandOptions {
  type: CommandType;
  x: number;
  y: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  opacity?: number;
  color?: string;
  size?: number;
  zIndex?: number;
  entityId: Entity;
  vertices?: ReadonlyArray<{ readonly x: number; readonly y: number }> | null;
  hitFlashFrames?: number;
  data?: Record<string, unknown> | null;
}

/**
 * Render command buffer designed to minimize per-frame allocations.
 *
 * @responsibility Store and sort drawing commands for the backend renderer.
 * @responsibility Minimize Garbage Collector (GC) pressure via pre-allocated pooling.
 *
 * @remarks
 * Encapsulates all drawing operations of a frame in a flat list.
 * Allows decoupling simulation logic (what to draw) from presentation logic (how to draw).
 *
 * ### Key Features:
 * 1. **Z-Index Sorting**: Ensures stable draw order via insertion sort.
 * 2. **Object Pooling**: Recycles {@link DrawCommand} objects to avoid mid-frame allocations.
 *
 * @public
 */
export class RenderCommandBuffer {
  private readonly pool: DrawCommand[];
  private activeCount: number = 0;
  private readonly MAX_COMMANDS: number;
  private overflowWarned: boolean = false;

  /**
   * Initializes the buffer with a fixed pool size.
   *
   * @param maxCommands - Maximum number of commands supported per frame.
   */
  constructor(maxCommands: number = 2000) {
    this.MAX_COMMANDS = maxCommands;
    this.pool = new Array(maxCommands);
    for (let i = 0; i < maxCommands; i++) {
      this.pool[i] = {
        type: '',
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        color: '',
        size: 0,
        vertices: null,
        hitFlashFrames: 0,
        zIndex: 0,
        entityId: 0,
        data: null
      };
    }
  }

  /**
   * Resets the buffer for a new frame cycle.
   */
  public clear(): void {
    this.activeCount = 0;
  }

  /**
   * Adds a render command by updating the next available pooled object.
   *
   * @param options - Visual configuration for the drawing operation.
   *
   * @remarks
   * If the `MAX_COMMANDS` limit is reached, subsequent calls are silently
   * ignored to preserve stability.
   */
  public addCommand(options: DrawCommandOptions): void {
    if (this.activeCount >= this.MAX_COMMANDS) {
      if (false && !this.overflowWarned) {
        console.warn(`[RenderCommandBuffer] Overflow! Maximum commands (${this.MAX_COMMANDS}) reached. Some entities will not be rendered.`);
        this.overflowWarned = true;
      }
      return;
    }

    const cmd = this.pool[this.activeCount];
    cmd.type = options.type;
    cmd.x = options.x;
    cmd.y = options.y;
    cmd.rotation = options.rotation ?? 0;
    cmd.scaleX = options.scaleX ?? 1;
    cmd.scaleY = options.scaleY ?? 1;
    cmd.opacity = options.opacity ?? 1;
    cmd.color = options.color ?? '';
    cmd.size = options.size ?? 0;
    cmd.zIndex = options.zIndex ?? 0;
    cmd.entityId = options.entityId;
    cmd.vertices = options.vertices ?? null;
    cmd.hitFlashFrames = options.hitFlashFrames ?? 0;
    cmd.data = options.data ?? null;

    this.activeCount++;
  }

  /**
   * Iterates over all active commands for the current frame.
   * This is the preferred way to consume commands without exposing the internal pool.
   *
   * @param callback - Function to execute for each active command.
   */
  public forEachCommand(callback: (cmd: DrawCommand, index: number) => void): void {
    for (let i = 0; i < this.activeCount; i++) {
      callback(this.pool[i], i);
    }
  }

  /**
   * Returns the command pool.
   * @remarks
   * Only the first getCount elements contain valid data for the current frame.
   * @deprecated Use forEachCommand() for better safety and encapsulation.
   */
  public getCommands(): readonly DrawCommand[] {
    return this.pool;
  }

  /**
   * Returns the number of active commands in the current frame.
   */
  public getCount(): number {
    return this.activeCount;
  }

  /**
   * Performs an in-place stable insertion sort on active commands.
   *
   * @remarks
   * Optimized for nearly-sorted arrays, which is common for Z-indices in 2D games.
   * Stability prevents visual flickering between entities sharing the same Z-index.
   */
  public sort(): void {
    for (let i = 1; i < this.activeCount; i++) {
      const key = this.pool[i];
      const keyZ = key.zIndex;
      let j = i - 1;

      while (j >= 0 && this.pool[j].zIndex > keyZ) {
        // Swap references in the pre-allocated pool array
        const temp = this.pool[j + 1];
        this.pool[j + 1] = this.pool[j];
        this.pool[j] = temp;
        j--;
      }
    }
  }
}
