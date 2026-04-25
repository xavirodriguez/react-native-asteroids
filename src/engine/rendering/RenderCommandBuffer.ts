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
  data: Record<string, unknown> | null;
}

/**
 * Opciones para añadir un comando al buffer.
 * Evita el uso de parámetros posicionales excesivos.
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
  vertices?: { x: number; y: number }[] | null;
  hitFlashFrames?: number;
  data?: Record<string, unknown> | null;
}

/**
 * Buffer de comandos de renderizado persistente diseñado para minimizar las asignaciones por frame.
 *
 * @remarks
 * Utiliza un array de tamaño fijo con objetos de comando pre-asignados.
 * Emplea un ordenamiento estable in-situ para mantener el orden de renderizado con una sobrecarga mínima.
 * Renombrado de CommandBuffer a RenderCommandBuffer para evitar ambigüedad con WorldCommandBuffer.
 *
 * @responsibility Almacenar y ordenar comandos de dibujo para el renderer.
 * @responsibility Minimizar la presión sobre el recolector de basura (GC) mediante pooling.
 */
export class RenderCommandBuffer {
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
   * Reinicia el buffer para un nuevo frame.
   */
  public clear(): void {
    this.activeCount = 0;
  }

  /**
   * Añade un comando al buffer actualizando el siguiente objeto disponible del pool.
   *
   * @param options - Configuración del comando de dibujo.
   */
  public addCommand(options: DrawCommandOptions): void {
    if (this.activeCount >= this.MAX_COMMANDS) {
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
   * Devuelve el array de comandos. Solo los primeros `getCount()` elementos son válidos.
   */
  public getCommands(): readonly DrawCommand[] {
    return this.pool;
  }

  /**
   * Obtiene la cantidad de comandos activos en el buffer.
   */
  public getCount(): number {
    return this.activeCount;
  }

  /**
   * Ordenamiento por inserción in-situ. Eficiente para arrays casi ordenados (típico para Z-indices).
   * Busca preservar la estabilidad para evitar parpadeos visuales.
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
