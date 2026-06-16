/**
 * @packageDocumentation
 * TinyAster Core: A lightweight, extensible ECS engine for high-performance
 * arcade-style games.
 *
 * @remarks
 * This package provides the foundational building blocks for entities,
 * components, systems, and world management. It is designed to be
 * platform-agnostic and supports reproducible simulations under
 * controlled conditions.
 */

// ECS Core
export * from "./ecs/Entity";
export * from "./ecs/Component";
export * from "./ecs/World";
export * from "./ecs/Query";
export * from "./ecs/System";
export * from "./ecs/WorldCommandBuffer";
export * from "./ecs/BlueprintRegistry";
export * from "./ecs/CoreComponents";
export * from "./snapshots/WorldSnapshot";
export * from "./ecs/ComponentCloner";

// Core Game Abstractions
export * from "./core/BaseGame";
export * from "./core/GameLoop";
export * from "./core/FrameScheduler";
export * from "./core/AssetLoader";
export * from "./core/Renderer";

// Events
export * from "./events/EventBus";

// Input
export * from "./input/UnifiedInputSystem";

// Physics
export * from "./physics/systems/BoundarySystem";
export * from "./physics/systems/FrictionSystem";
export * from "./physics/systems/MovementSystem";
export * from "./physics/collision/CollisionSystems";
export * from "./physics/collision/CollisionTypes";
export * from "./physics/utils/PhysicsUtils";
export * from "./physics/shapes/Shapes";
export * from "./physics/query/PhysicsQuery";
export * from "./physics/dynamics/PhysicsIntegrateSystem";
export * from "./physics/dynamics/PhysicsSolveSystem";

// Rendering
export * from "./rendering/Camera2D";

// Systems
export * from "./systems/AbstractHierarchySystem";
export * from "./systems/AnimationSystem";
export * from "./systems/FeedbackSystem";
export * from "./systems/HierarchySystem";
export * from "./systems/JoystickSystem";
export * from "./systems/JuiceSystem";
export * from "./systems/MutatorSystem";
export * from "./systems/ParticleSystem";
export * from "./systems/RenderUpdateSystem";
export * from "./systems/ScreenShakeSystem";
export * from "./systems/SpatialPartitioningSystem";
export * from "./systems/StateMachineSystem";
export * from "./systems/TTLSystem";
export * from "./systems/TilemapRenderSystem";
export * from "./systems/BaseGameStateSystem";

// UI
export * from "./ui/UIFactory";
export * from "./ui/UIInputSystem";
export * from "./ui/debug/DebugSystem";

// Network
export * from "./network/NetworkTransport";
export * from "./network/NetworkManager";
export * from "./network/MultiplayerSystems";
export * from "./network/ReplicationSystem";

// Config
export * from "./config/ConfigService";

// Utils
export * from "./utils/RandomService";
export * from "./utils/Juice";

export type { DeepReadonly } from "./ecs/Component";
