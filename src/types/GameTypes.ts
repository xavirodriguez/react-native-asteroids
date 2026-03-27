/**
 * Hub for re-exporting types for backward compatibility and centralized access.
 * Note: Game-specific types are increasingly located in their respective game folders.
 */
import {
  Component,
  Entity,
  PositionComponent,
  VelocityComponent,
  TTLComponent,
  ColliderComponent,
  HealthComponent,
  RenderComponent,
  ReclaimableComponent
} from "../engine/types/EngineTypes";

export type {
  Component,
  Entity,
  PositionComponent,
  VelocityComponent,
  TTLComponent,
  ColliderComponent,
  HealthComponent,
  RenderComponent,
  ReclaimableComponent
};

// Re-export Asteroids types for backward compatibility
export * from "../games/asteroids/types/AsteroidTypes";
