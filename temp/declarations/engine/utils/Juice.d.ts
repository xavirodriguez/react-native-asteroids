import { World } from "../core/World";
import { Entity } from "../types/EngineTypes";
/**
 * Biblioteca centralizada de efectos visuales y "juice" para el motor.
 */
export declare class Juice {
    /**
     * Aplica un efecto de parpadeo blanco (hit flash) a una entidad.
     */
    static flash(world: World, entity: Entity, frames?: number): void;
    /**
     * Aplica un temblor de pantalla.
     */
    static shake(world: World, intensity?: number, duration?: number): void;
    /**
     * Efecto de escalado elástico (pop).
     */
    static pop(world: World, entity: Entity, scale?: number, duration?: number): void;
    /**
     * Helper estático para añadir una animación a una entidad.
     */
    static add(world: World, entity: Entity, anim: any): void;
    /**
     * Efecto de squash & stretch.
     */
    static squash(world: World, entity: Entity, sx?: number, sy?: number, duration?: number): void;
}
