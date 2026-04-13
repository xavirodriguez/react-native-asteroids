import { System } from "../core/System";
import { World } from "../core/World";
/**
 * Sistema de preparación visual y efectos cosméticos.
 *
 * @responsibility Gestionar efectos visuales temporales como estelas (trails) y destellos (flashes).
 * @responsibility Actualizar la rotación cosmética basada en la velocidad angular.
 * @responsibility Sincronizar la versión del mundo para disparar re-renders en la UI.
 * @queries Transform, Render, Ship
 * @mutates Render.trailPositions, Render.rotation, Render.hitFlashFrames, World.version
 * @executionOrder Fase: Presentation. Ejecutar al final del pipeline de simulación.
 *
 * @remarks
 * Este sistema actúa como un puente entre la simulación física y la presentación visual.
 * Incrementa {@link World.version} para asegurar que los componentes de React/UI se
 * actualicen con el estado más reciente del motor.
 *
 * @conceptualRisk [PERFORMANCE][MEDIUM] El crecimiento de arrays en `trailPositions` genera
 * presión sobre el GC si hay muchas entidades con estela activa.
 * @conceptualRisk [DETERMINISM][LOW] Mutar `Render.rotation` puede causar desincronización
 * si la lógica de colisiones u otra lógica de simulación depende accidentalmente de este valor.
 */
export declare class RenderUpdateSystem extends System {
    protected trailMaxLength: number;
    constructor(trailMaxLength?: number);
    update(world: World, deltaTime: number): void;
    protected updateTrails(world: World): void;
    private updateRotation;
    private updateHitFlashes;
}
