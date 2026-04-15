import { Entity } from "../core/Entity";
import { RenderComponent } from "../core/CoreComponents";

export interface DrawCommand {
  type: 'entity' | 'particle' | 'tilemap' | 'custom';
  entityId: Entity;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  render: RenderComponent;
  zIndex: number;
  data?: Record<string, unknown> | null;
}

/**
 * Pool de objetos para comandos de dibujo para evitar GC pressure.
 */
export class CommandPool {
  private pool: DrawCommand[] = [];
  private index: number = 0;

  public get(): DrawCommand {
    if (this.index >= this.pool.length) {
      this.pool.push({
        type: 'entity',
        entityId: 0,
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        render: { shape: 'circle', size: 10, color: 'white', rotation: 0, type: 'Render' } as RenderComponent,
        zIndex: 0
      });
    }
    return this.pool[this.index++];
  }

  public reset(): void {
    this.index = 0;
  }
}
