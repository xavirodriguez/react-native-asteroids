/**
 * @packageDocumentation
 * Entrypoint principal de TinyAsterEngine.
 *
 * Este archivo consolida y expone la API pública del motor, organizada por dominios.
 * Se priorizan las versiones modernas y canónicas de cada sistema.
 *
 * @warning Algunas exportaciones pueden incluir componentes internos necesarios para la extensibilidad,
 * pero cuyo uso directo no está recomendado para lógica de alto nivel.
 *
 * @remarks
 * El motor está diseñado con la intención de mitigar las alocaciones en hot-paths, aunque no pretende garantizar
 * un comportamiento "zero-allocation" absoluto. Se busca facilitar la reproducibilidad de la simulación
 * bajo condiciones operativas controladas.
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
export { PhysicsUtils } from './physics/utils/PhysicsUtils';
export { PhysicsSystem2D } from './physics/dynamics/PhysicsSystem2D';
export { CollisionSystem2D, type CollisionCallback, type TriggerCallback } from './physics/collision/CollisionSystem2D';
export type { CollisionEvent } from './core/CoreComponents';
export { CollisionLayers } from './physics/collision/CollisionLayers';
export { PhysicsQuery } from './physics/query/PhysicsQuery';
export { type CollisionManifold } from './physics/collision/CollisionTypes';
export * from './physics/shapes/ShapeTypes';
export type { Shape, CircleShape, AABBShape, CapsuleShape, PolygonShape, ShapeType } from './physics/shapes/ShapeTypes';
export * from './physics/shapes/ShapeFactory';
export * from './physics/query/QueryTypes';
export { MovementSystem } from './physics/systems/MovementSystem';
export { FrictionSystem } from './physics/systems/FrictionSystem';
export { BoundarySystem } from './physics/systems/BoundarySystem';

// --- RENDERING ---
export * from './rendering/RenderTypes';
export type { TransformSnapshot, RenderCommand } from './rendering/RenderTypes';
export { type Renderer, type ShapeDrawer, type EffectDrawer } from './rendering/Renderer';
export { RenderSnapshot } from './rendering/RenderSnapshot';
export { RenderCommandBuffer, type DrawCommand, type DrawCommandOptions, type CommandType } from './rendering/RenderCommandBuffer';
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
export { RandomService } from './utils/RandomService';
export { PrefabPool } from './utils/PrefabPool';
export { runLifecycleSync, runLifecycleAsync } from './utils/LifecycleUtils';

// --- SYSTEMS ---
export { HierarchySystem } from './systems/HierarchySystem';

// --- LEGACY (Transitional Compatibility) ---
export * as Legacy from './legacy';
export { TTLSystem } from './systems/TTLSystem';
export { JuiceSystem } from './systems/JuiceSystem';
export { ParticleSystem } from './systems/ParticleSystem';
export { ScreenShakeSystem } from './systems/ScreenShakeSystem';
export type { ScreenShakeComponent } from './core/CoreComponents';
export { RenderUpdateSystem } from './systems/RenderUpdateSystem';
export { AnimationSystem } from './systems/AnimationSystem';
export { StateMachineSystem } from './systems/StateMachineSystem';
export { TilemapRenderSystem } from './systems/TilemapRenderSystem';
