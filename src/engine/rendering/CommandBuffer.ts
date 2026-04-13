import { Entity } from "../core/Entity";

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
 * Buffer de comandos poolificado para evitar asignaciones de memoria por frame.
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

  /**
   * Ordena los comandos activos por su Z-index utilizando un algoritmo de inserción in-place.
   */
  public sort(): void {
    for (let i = 1; i < this.activeCount; i++) {
      const key = this.pool[i];
      let j = i - 1;

      while (j >= 0 && this.pool[j].zIndex > key.zIndex) {
        this.pool[j + 1] = this.pool[j];
        j = j - 1;
      }
      this.pool[j + 1] = key;
    }
  }
}
