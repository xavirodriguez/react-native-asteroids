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
export { type CollisionManifold } from './physics/collision/CollisionTypes';
export * from './physics/shapes/ShapeTypes';
export type { Shape, CircleShape, AABBShape, CapsuleShape, PolygonShape, ShapeType } from './physics/shapes/ShapeTypes';
export * from './physics/query/QueryTypes';

// --- RENDERING ---
export * from './rendering/RenderTypes';
export type { TransformSnapshot, RenderCommand } from './rendering/RenderTypes';
export { type Renderer, type ShapeDrawer, type EffectDrawer } from './rendering/Renderer';
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
