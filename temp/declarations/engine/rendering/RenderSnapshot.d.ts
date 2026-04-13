import { Entity } from "../core/Entity";
/**
 * Snapshot de una entidad para renderizado.
 *
 * @remarks
 * Contiene el estado visual capturado en un momento específico de la simulación.
 * Se utiliza para desacoplar la simulación del renderizado y permitir interpolación.
 *
 * @conceptualRisk [STALE_DATA][LOW] Si los datos no se actualizan antes de cada frame,
 * se mostrará una imagen "congelada" de la entidad.
 */
export interface RenderEntitySnapshot {
    id: Entity;
    x: number;
    y: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
    opacity: number;
    zIndex: number;
    shape: string;
    color: string;
    size: number;
    vertices: {
        x: number;
        y: number;
    }[] | null;
    hitFlashFrames: number;
    data: any;
}
/**
 * Snapshot completo de un frame de renderizado.
 *
 * @remarks
 * Representa el estado visual total del mundo en un instante dado, incluyendo efectos globales.
 *
 * @responsibility Agrupar todas las entidades renderizables y efectos de cámara (shake).
 *
 * @conceptualRisk [ARRAY_MUTATION][MEDIUM] El array `entities` es compartido.
 * Cambiar su contenido externamente puede corromper el frame de renderizado.
 */
export interface RenderSnapshot {
    entities: RenderEntitySnapshot[];
    entityCount: number;
    shakeX: number;
    shakeY: number;
}
