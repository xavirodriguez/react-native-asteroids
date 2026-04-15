/**
 * @packageDocumentation
 * Entrypoint principal de TinyAsterEngine.
 *
 * Este archivo consolida y expone la API pública del motor, organizada por dominios.
 * Se priorizan las versiones modernas y canónicas de cada sistema.
 */

// --- Core ECS ---
export * from './core/World';
export * from './core/Query';
export * from './core/EntityPool';
export * from './core/GameLoop';
export * from './core/System';
export * from './core/BaseGame';
export * from './core/IGame';

// --- Types ---
export * from './types/EngineTypes';

// --- Physics & Collision ---
export * from './collision/SpatialHash';
export * from './physics/shapes/ShapeTypes';
export * from './physics/shapes/ShapeFactory';
export * from './physics/collision/CollisionSystem2D';
export * from './physics/collision/CollisionLayers';
export * from './physics/collision/NarrowPhase';
export * from './physics/collision/BroadPhase';
export * from './physics/collision/ContinuousCollision';
export * from './physics/query/PhysicsQuery';
export * from './physics/query/QueryTypes';
export * from './physics/dynamics/PhysicsSystem2D';
export * from './physics/debug/PhysicsDebugSystem';

// --- Rendering ---
export * from './rendering/RenderTypes';
export { type ShapeDrawer, type EffectDrawer } from './rendering/Renderer';
export * from './rendering/CanvasRenderer';
export * from './rendering/SkiaRenderer';
export * from './rendering/RenderSnapshot';
export * from './rendering/CommandBuffer';

// --- Input ---
export * from './input/InputTypes';
export * from './input/UnifiedInputSystem';

// --- Scenes ---
export * from './scenes/Scene';
export * from './scenes/SceneManager';

// --- Assets ---
export * from './assets/AssetTypes';
export * from './assets/AssetLoader';

// --- Utils ---
export * from './utils/PhysicsUtils';
export * from './utils/RandomService';
export * from './utils/PrefabPool';

// --- Systems ---
export * from './systems/HierarchySystem';
export * from './systems/MovementSystem';
export * from './systems/FrictionSystem';
export * from './systems/BoundarySystem';
export * from './systems/TTLSystem';
export * from './systems/JuiceSystem';
export * from './systems/ParticleSystem';
export * from './systems/ScreenShakeSystem';
export * from './systems/RenderUpdateSystem';
export * from './systems/AnimationSystem';
export * from './systems/StateMachineSystem';
export * from './systems/TilemapRenderSystem';

// --- Namespaces ---
export * as Legacy from './legacy';
