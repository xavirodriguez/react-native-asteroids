import { Entity, WorldSnapshot, IEntityPool } from "@tiny-aster/core";

export type { Entity, WorldSnapshot, IEntityPool };

/**
 * Hub for re-exporting types for backward compatibility and centralized access.
 * Note: Game-specific types are increasingly located in their respective game folders.
 */

// Re-export Asteroids types for backward compatibility from core
export { INITIAL_GAME_STATE } from "@tiny-aster/core/games/asteroids";
export type { GameStateComponent, InputState, ShipComponent, BulletComponent, UfoComponent, InputComponent } from "@tiny-aster/core/games/asteroids";
