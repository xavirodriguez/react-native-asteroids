import { Entity } from "../core/Entity";
import { World } from "../core/World";

export type CommandType = 'circle' | 'rect' | 'polygon' | 'custom';

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
 * CommandBuffer pooled to avoid per-frame allocations.
 */
export class CommandBuffer {
  private pool: DrawCommand[] = [];
  private activeCount: number = 0;
  private readonly MAX_COMMANDS = 2000;

  constructor() {
    for (let i = 0; i < this.MAX_COMMANDS; i++) {
      this.pool.push({
        type: 'circle',
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
      });
    }
  }

  public clear(): void {
    this.activeCount = 0;
  }

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
    if (this.activeCount >= this.MAX_COMMANDS) return;

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

  public getCommands(): DrawCommand[] {
    return this.pool;
  }

  public getCount(): number {
    return this.activeCount;
  }

  public sort(): void {
    // In-place insertion sort for z-index stability and zero allocation
    for (let i = 1; i < this.activeCount; i++) {
      const key = this.pool[i];
      const keyZ = key.zIndex;
      let j = i - 1;

      // We need to swap the actual objects or their content?
      // Swapping objects in the pool array is fine as long as we don't lose references.
      while (j >= 0 && this.pool[j].zIndex > keyZ) {
        const temp = this.pool[j+1];
        this.pool[j + 1] = this.pool[j];
        this.pool[j] = temp;
        j = j - 1;
      }
    }
  }
}
