import { Entity } from "../core/Entity";

export type CommandType = string;

export interface DrawCommand {
  type: CommandType;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  color: string;
  size: number;
  vertices: { x: number; y: number }[] | null;
  hitFlashFrames: number;
  zIndex: number;
  entityId: Entity;
  data: any;
}

/**
 * Persistently pooled command buffer to eliminate per-frame allocations.
 *
 * @remarks
 * Uses a fixed-size array of pre-allocated command objects.
 * Employs a stable, in-place sort to maintain render order with minimal overhead.
 */
export class CommandBuffer {
  private readonly pool: DrawCommand[];
  private activeCount: number = 0;
  private readonly MAX_COMMANDS: number;

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
   * Resets the buffer for a new frame.
   */
  public clear(): void {
    this.activeCount = 0;
  }

  /**
   * Adds a command to the buffer by updating the next available pooled object.
   */
  public addCommand(
    type: CommandType,
    x: number,
    y: number,
    rotation: number,
    scaleX: number,
    scaleY: number,
    opacity: number,
    color: string,
    size: number,
    zIndex: number,
    entityId: Entity,
    vertices: { x: number; y: number }[] | null = null,
    hitFlashFrames: number = 0,
    data: any = null
  ): void {
    if (this.activeCount >= this.MAX_COMMANDS) {
      return;
    }

    const cmd = this.pool[this.activeCount];
    cmd.type = type;
    cmd.x = x;
    cmd.y = y;
    cmd.rotation = rotation;
    cmd.scaleX = scaleX;
    cmd.scaleY = scaleY;
    cmd.opacity = opacity;
    cmd.color = color;
    cmd.size = size;
    cmd.zIndex = zIndex;
    cmd.entityId = entityId;
    cmd.vertices = vertices;
    cmd.hitFlashFrames = hitFlashFrames;
    cmd.data = data;

    this.activeCount++;
  }

  /**
   * Returns the array of commands. Only the first `getCount()` elements are valid.
   */
  public getCommands(): readonly DrawCommand[] {
    return this.pool;
  }

  public getCount(): number {
    return this.activeCount;
  }

  /**
   * In-place insertion sort. Efficient for nearly-sorted arrays typical of Z-indices.
   * Stability is preserved to prevent flickering.
   */
  public sort(): void {
    for (let i = 1; i < this.activeCount; i++) {
      const key = this.pool[i];
      const keyZ = key.zIndex;
      let j = i - 1;

      // Move elements of pool[0..i-1] that are greater than key.zIndex
      // to one position ahead of their current position
      while (j >= 0 && this.pool[j].zIndex > keyZ) {
        // We can't just assign pool[j+1] = pool[j] because they are references to pooled objects.
        // We need to swap the contents or swap the references in the array.
        // Since we want to keep the pool array as the source of truth, swapping references is better.
        const temp = this.pool[j + 1];
        this.pool[j + 1] = this.pool[j];
        this.pool[j] = temp;
        j--;
      }
    }
  }
}
