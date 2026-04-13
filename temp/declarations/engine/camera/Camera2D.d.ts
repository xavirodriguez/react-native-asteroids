import { System } from "../core/System";
import { World } from "../core/World";
import { Camera2DComponent, Entity } from "../types/EngineTypes";
export interface CameraConfig {
    viewport: {
        width: number;
        height: number;
    };
    bounds?: {
        minX: number;
        minY: number;
        maxX: number;
        maxY: number;
    };
    smoothing?: number;
    offset?: {
        x: number;
        y: number;
    };
}
/**
 * Lógica de Cámara 2D agnóstica a la plataforma.
 * Gestiona el seguimiento de objetivos, suavizado y efectos de sacudida.
 *
 * @responsibility Transformar coordenadas del mundo a coordenadas de pantalla y viceversa.
 * @responsibility Implementar suavizado de movimiento de cámara mediante interpolación exponencial.
 */
export declare class Camera2D extends System {
    private viewport;
    constructor(config?: CameraConfig);
    setViewport(width: number, height: number): void;
    /**
     * Actualiza el estado de todas las cámaras activas en el mundo.
     *
     * @param world - El mundo ECS que contiene las cámaras.
     * @param deltaTime - Tiempo transcurrido en milisegundos.
     */
    update(world: World, deltaTime: number): void;
    static follow(world: World, target: Entity): void;
    static shake(world: World, intensity: number): void;
    static worldToScreen(worldPos: {
        x: number;
        y: number;
    }, cam: Camera2DComponent): {
        x: number;
        y: number;
    };
    static screenToWorld(screenPos: {
        x: number;
        y: number;
    }, cam: Camera2DComponent): {
        x: number;
        y: number;
    };
}
