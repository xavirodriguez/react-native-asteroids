/**
 * @packageDocumentation
 * Entrypoint principal del engine 2D retro.
 * Organizado en módulos para facilitar la extensibilidad y el mantenimiento.
 */

// --- CORE ECS ---
export { World } from './core/World';
export { Query } from './core/Query';
export { System, SystemPhase } from './core/System';
export { GameLoop } from './core/GameLoop';
export { EntityPool } from './core/EntityPool';
export type { Entity } from './core/Entity';
export type { Component } from './core/Component';
export * from './core/CoreComponents';

// --- PHYSICS & COLLISION ---
export { PhysicsSystem2D } from './physics/dynamics/PhysicsSystem2D';
export { CollisionSystem2D } from './physics/collision/CollisionSystem2D';
export { CollisionLayers } from './physics/collision/CollisionLayers';
export { SpatialHash } from './collision/SpatialHash';
export { PhysicsQuery } from './physics/query/PhysicsQuery';
export type { AABB } from './types/CommonTypes';
export * from './physics/shapes/ShapeTypes';
export * from './physics/shapes/ShapeFactory';
export * from './physics/query/QueryTypes';

// --- RENDERING ---
export * from './rendering/RenderTypes';
export type { CollisionManifold } from './legacy/LegacyComponents';
export { Camera2D } from './camera/Camera2D';
export { CameraSystem } from './camera/CameraSystem';

// --- INPUT ---
export { UnifiedInputSystem } from './input/UnifiedInputSystem';
export * from './input/InputTypes';

// Scenes
export * from './scenes/Scene';
export * from './scenes/SceneManager';

// Assets
export * from './assets/AssetTypes';
export * from './assets/AssetLoader';

// Utils
export * from './utils/PhysicsUtils';
export * from './utils/RandomService';
export * from './utils/PrefabPool';

// Systems
export * from './systems/HierarchySystem';
export * from './systems/MovementSystem';
export * from './systems/FrictionSystem';
export * from './systems/BoundarySystem';
export * from './systems/TTLSystem';
export * from './systems/JuiceSystem';
export * from './systems/ParticleSystem';
export * from './systems/ScreenShakeSystem';

// Legacy API
import * as Legacy from './legacy';
export { Legacy };
