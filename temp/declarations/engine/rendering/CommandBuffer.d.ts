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
    vertices: {
        x: number;
        y: number;
    }[] | null;
    hitFlashFrames: number;
    zIndex: number;
    entityId: Entity;
    data: any;
}
/**
 * Buffer de comandos poolificado para evitar asignaciones de memoria por frame.
 */
export declare class CommandBuffer {
    private pool;
    private activeCount;
    private readonly MAX_COMMANDS;
    constructor();
    clear(): void;
    addCommand(type: CommandType, x: number, y: number, rotation: number, scaleX: number, scaleY: number, opacity: number, color: string, size: number, zIndex: number, entityId: Entity, vertices?: {
        x: number;
        y: number;
    }[] | null, hitFlashFrames?: number, data?: any): void;
    getCommands(): DrawCommand[];
    getCount(): number;
    /**
     * Ordena los comandos activos por su Z-index utilizando un algoritmo de inserción in-place.
     */
    sort(): void;
}
