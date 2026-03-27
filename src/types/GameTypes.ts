/**
 * Hub for re-exporting types for backward compatibility and centralized access.
 * Note: Game-specific types are increasingly located in their respective game folders.
 */

export * from "../engine/types/EngineTypes";
// Re-export Asteroids types for backward compatibility
export * from "../games/asteroids/types/AsteroidTypes";
