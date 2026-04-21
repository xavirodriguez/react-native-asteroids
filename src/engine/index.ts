/**
 * @packageDocumentation
 * Entrypoint principal de TinyAsterEngine.
 *
 * Este archivo consolida y expone la API pública del motor, organizada por dominios.
 * Se priorizan las versiones modernas y canónicas de cada sistema.
 */

// --- CORE ECS ---
export { World } from './core/World';
export { Query } from './core/Query';
export { System, SystemPhase } from './core/System';
export { GameLoop } from './core/GameLoop';
export { EntityPool } from './core/EntityPool';
export { BaseGame } from './core/BaseGame';
export type { IGame } from './core/IGame';
export type { Entity } from './core/Entity';
export type { Component } from './core/Component';
export * from './core/CoreComponents';

// --- TYPES ---
export * from './types/EngineTypes';
export type { AABB } from './types/CommonTypes';

// --- PHYSICS & COLLISION ---
export { PhysicsSystem2D } from './physics/dynamics/PhysicsSystem2D';
export { CollisionSystem2D, type CollisionCallback, type TriggerCallback } from './physics/collision/CollisionSystem2D';
export { CollisionLayers } from './physics/collision/CollisionLayers';
export { SpatialHash } from './physics/collision/SpatialHash';
export { PhysicsQuery } from './physics/query/PhysicsQuery';
export { NarrowPhase } from './physics/collision/NarrowPhase';
export { BroadPhase } from './physics/collision/BroadPhase';
export { ContinuousCollision, type CCDResult } from './physics/collision/ContinuousCollision';
export { type CollisionManifold } from './physics/collision/CollisionTypes';
export * from './physics/shapes/ShapeTypes';
export * from './physics/shapes/ShapeFactory';
export * from './physics/query/QueryTypes';

// --- RENDERING ---
export * from './rendering/RenderTypes';
export type { TransformSnapshot } from './rendering/RenderTypes';
export { type Renderer, type ShapeDrawer, type EffectDrawer } from './rendering/Renderer';
export { CanvasRenderer } from './rendering/CanvasRenderer';
export { SkiaRenderer } from './rendering/SkiaRenderer';
export { RenderSnapshot } from './rendering/RenderSnapshot';
export { CommandBuffer, type DrawCommand, type DrawCommandOptions, type CommandType } from './rendering/CommandBuffer';
export { Camera2D } from './camera/Camera2D';

// --- INPUT ---
export { UnifiedInputSystem } from './input/UnifiedInputSystem';
export * from './input/InputTypes';

// --- SCENES ---
export { Scene } from './scenes/Scene';
export { SceneManager, SceneState } from './scenes/SceneManager';

// --- ASSETS ---
export * from './assets/AssetTypes';
export { AssetLoader } from './assets/AssetLoader';

// --- UTILS ---
export * from './utils/PhysicsUtils';
export { RandomService } from './utils/RandomService';
export { PrefabPool } from './utils/PrefabPool';
export { runLifecycleSync, runLifecycleAsync } from './utils/LifecycleUtils';

// --- SYSTEMS ---
export { HierarchySystem } from './systems/HierarchySystem';
export { MovementSystem } from './systems/MovementSystem';
export { FrictionSystem } from './systems/FrictionSystem';
export { BoundarySystem } from './systems/BoundarySystem';
export { TTLSystem } from './systems/TTLSystem';
export { JuiceSystem } from './systems/JuiceSystem';
export { ParticleSystem } from './systems/ParticleSystem';
export { ScreenShakeSystem } from './systems/ScreenShakeSystem';
export { RenderUpdateSystem } from './systems/RenderUpdateSystem';
export { AnimationSystem } from './systems/AnimationSystem';
export { StateMachineSystem } from './systems/StateMachineSystem';
export { TilemapRenderSystem } from './systems/TilemapRenderSystem';

// --- NAMESPACES ---
import * as Legacy from './legacy';
export { Legacy };
