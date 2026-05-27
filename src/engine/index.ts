/**
 * @packageDocumentation
 * Main entrypoint for the TinyAsterEngine.
 *
 * API status: Public
 *
 * @remarks
 * This file consolidates and exposes the public API of the engine, organized by domains.
 * Modern and canonical versions of each system are prioritized.
 *
 * Warning: Some exports may include internal components necessary for extensibility
 * but are not recommended for high-level logic.
 *
 * The engine is designed to minimize per-frame allocations in hot paths. It seeks to
 * support simulation reproducibility when used under controlled conditions (e.g.,
 * seeded RNG, consistent execution order, and restricted mutation patterns).
 *
 * ### Standard Units
 *
 * - **Position/Distance**: Pixels `[px]`
 * - **Linear Velocity**: Pixels per second `[px/s]`
 * - **Linear Acceleration**: Pixels per second squared `[px/s^2]`
 * - **Rotation**: Radians `[rad]`
 * - **Angular Velocity**: Radians per second `[rad/s]`
 * - **System deltaTime**: Milliseconds `[ms]`
 * - **Physics Integration**: Seconds `[s]` (Low-level solvers)
 * - **Durations/Timers**: Milliseconds `[ms]`
 * - **Rates**: Per second `[1/s]` (e.g., Particle emission)
 */

// --- CORE ECS ---
/** @public */
export { World } from './core/World';
/** @public */
export { WorldCommandBuffer } from './core/WorldCommandBuffer';
/** @public */
export { EventBus } from './core/EventBus';
/** @public */
export { Query } from './core/Query';
/** @public */
export { System, SystemPhase } from './core/System';
/** @public */
export { GameLoop } from './core/GameLoop';
/** @public */
export { EntityPool } from './core/EntityPool';
/** @public */
export { BaseGame } from './core/BaseGame';
/** @public */
export type { IGame } from './core/IGame';
/** @public */
export type { Entity } from './core/Entity';
/** @public */
export type { Component } from './core/Component';
/** @public */
export * from './core/CoreComponents';

// --- TYPES ---
/** @public */
export * from './types/EngineTypes';
/** @public */
export type { AABB } from './types/CommonTypes';

// --- PHYSICS & COLLISION ---
/** @public */
export { PhysicsUtils } from './physics/utils/PhysicsUtils';
/** @deprecated Use PhysicsIntegrateSystem and PhysicsSolveSystem instead */
export { PhysicsSystem2D } from './physics/dynamics/PhysicsSystem2D';
/** @public */
export { CollisionSystem2D, type CollisionCallback, type TriggerCallback } from './physics/collision/CollisionSystem2D';
/** @public */
export type { CollisionEvent } from './core/CoreComponents';
/** @public */
export { CollisionLayers } from './physics/collision/CollisionLayers';
/** @public */
export { PhysicsQuery } from './physics/query/PhysicsQuery';
/** @public */
export { type CollisionManifold } from './physics/collision/CollisionTypes';
/** @public */
export * from './physics/shapes/ShapeTypes';
/** @public */
export type { Shape, CircleShape, AABBShape, CapsuleShape, PolygonShape, ShapeType } from './physics/shapes/ShapeTypes';
/** @public */
export * from './physics/shapes/ShapeFactory';
/** @public */
export * from './physics/query/QueryTypes';
/** @public */
export { MovementSystem } from './physics/systems/MovementSystem';
/** @public */
export { FrictionSystem } from './physics/systems/FrictionSystem';
/** @public */
export { BoundarySystem } from './physics/systems/BoundarySystem';

// --- RENDERING ---
/** @public */
export * from './rendering/RenderTypes';
/** @public */
export type { TransformSnapshot, RenderCommand } from './rendering/RenderTypes';
/** @public */
export { type Renderer, type ShapeDrawer, type EffectDrawer } from './rendering/Renderer';
/** @public */
export { RenderSnapshot } from './rendering/RenderSnapshot';
/** @public */
export { RenderCommandBuffer, type DrawCommand, type DrawCommandOptions, type CommandType } from './rendering/RenderCommandBuffer';
/** @public */
export { Camera2D } from './camera/Camera2D';

// --- INPUT ---
/** @public */
export { UnifiedInputSystem } from './input/UnifiedInputSystem';
/** @public */
export * from './input/InputTypes';

// --- SCENES ---
/** @public */
export { Scene } from './scenes/Scene';
/** @public */
export { SceneManager, SceneState } from './scenes/SceneManager';

// --- ASSETS ---
/** @public */
export * from './assets/AssetTypes';
/** @public */
export { AssetLoader } from './assets/AssetLoader';

// --- UTILS ---
/** @public */
export { RandomService } from './utils/RandomService';
/** @public */
export { PrefabPool } from './utils/PrefabPool';
/** @public */
export { runLifecycleSync, runLifecycleAsync } from './utils/LifecycleUtils';
export { createProjectile, releaseProjectile } from './utils/ProjectileUtils';

// --- SYSTEMS ---
/** @public */
export { HierarchySystem } from './systems/HierarchySystem';

// --- LEGACY (Transitional Compatibility) ---
/** @alpha */
export * as Legacy from './legacy';
/** @public */
export { TTLSystem } from './systems/TTLSystem';
/** @public */
export { JuiceSystem, type JuiceAnimation, type JuiceComponent } from './systems/JuiceSystem';
/** @public */
export { ParticleSystem } from './systems/ParticleSystem';
/** @public */
export { ScreenShakeSystem } from './systems/ScreenShakeSystem';
/** @public */
export type { ScreenShakeComponent } from './core/CoreComponents';
/** @public */
export { RenderUpdateSystem } from './systems/RenderUpdateSystem';
/** @public */
export { AnimationSystem } from './systems/AnimationSystem';
/** @public */
export { StateMachineSystem } from './systems/StateMachineSystem';
/** @public */
export { TilemapRenderSystem } from './systems/TilemapRenderSystem';
/** @public */
export { FeedbackSystem } from './systems/FeedbackSystem';
