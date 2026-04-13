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
    data?: any;
}
/**
 * Pool de objetos para comandos de dibujo para evitar GC pressure.
 */
export declare class CommandPool {
    private pool;
    private index;
    get(): DrawCommand;
    reset(): void;
}
