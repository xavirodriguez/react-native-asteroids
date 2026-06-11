// ECS Core
export * from "./ecs/Entity";
export * from "./ecs/Component";
export * from "./ecs/World";
export * from "./ecs/Query";
export * from "./ecs/System";
export * from "./ecs/WorldCommandBuffer";
export * from "./ecs/BlueprintRegistry";
export * from "./ecs/CoreComponents";

// Events
export * from "./events/EventBus";

// Assets & Audio
export * from "./assets/AssetProvider";
export * from "./assets/AssetLoader";
export * from "./audio/IAudioPlayer";

// Physics
export * from "./physics/CollisionHelpers";
export * from "./physics/shapes/ShapeTypes";
export * from "./physics/shapes/ShapeFactory";
export * from "./physics/collision/CollisionTypes";
export * from "./physics/collision/CollisionSystem2D";
<<<<<<< HEAD
export * from "./physics/collision/CCDSystem";
=======
>>>>>>> 93349d556c08ba34cd14983bf284c3a8e1459376
/** @internal */
export * from "./physics/dynamics/PhysicsIntegrateSystem";
/** @internal */
export * from "./physics/dynamics/PhysicsSolveSystem";
export * from "./physics/query/QueryTypes";
export * from "./physics/query/PhysicsQuery";
/** @internal */
export * from "./physics/utils/PhysicsUtils";
export * from "./physics/utils/SpatialGrid";

// Systems
export * from "./physics/systems/MovementSystem";
export * from "./physics/systems/FrictionSystem";
export * from "./physics/systems/BoundarySystem";
export * from "./systems/TTLSystem";
export * from "./systems/JuiceSystem";
export * from "./systems/ParticleSystem";
export * from "./systems/ScreenShakeSystem";
export * from "./systems/RenderUpdateSystem";
export * from "./systems/AnimationSystem";
export * from "./systems/StateMachineSystem";
export * from "./systems/TilemapRenderSystem";
export * from "./systems/FeedbackSystem";
export * from "./systems/HierarchySystem";
<<<<<<< HEAD
export * from "./systems/LootSystem";
export * from "./systems/ModifierSystem";
export * from "./systems/PowerUpSystem";
export * from "./systems/MutatorSystem";
export * from "./systems/JoystickSystem";
export * from "./systems/SpatialPartitioningSystem";
=======
>>>>>>> 93349d556c08ba34cd14983bf284c3a8e1459376

// Runtime
export * from "./runtime/GameCommand";
export * from "./runtime/BaseGame";

// Loop
export * from "./loop/GameLoop";
/** @internal */
export * from "./loop/FrameScheduler";

// Utils
export * from "./utils/RandomService";
export * from "./utils/ObjectPool";
/** @internal */
export * from "./utils/LifecycleUtils";
/** @internal */
export * from "./utils/PrefabPool";

// Math
export * from "./math/CommonTypes";

// Rendering
export type { Renderer, ShapeDrawer, EffectDrawer } from "./rendering/Renderer";
<<<<<<< HEAD
export * from "./rendering/Renderer";
=======
>>>>>>> 93349d556c08ba34cd14983bf284c3a8e1459376
export * from "./rendering/RenderTypes";
export * from "./rendering/RenderSnapshot";
export * from "./rendering/RenderCommandBuffer";
export * from "./rendering/Camera2D";

// Network
export * from "./network/NetworkTransport";
<<<<<<< HEAD
export * from "./network/NetworkManager";
export * from "./network/systems/ReplicationSystem";

// Input
export * from "./input/UnifiedInputSystem";
export * from "./input/JoystickTypes";
=======

// Input
export * from "./input/UnifiedInputSystem";
>>>>>>> 93349d556c08ba34cd14983bf284c3a8e1459376

// Scenes
export * from "./scenes/Scene";
export * from "./scenes/SceneManager";

/**
 * Additional exports for compatibility and migration purposes.
 * @deprecated Many of these will be moved to internal or specialized modules in future versions.
 * Prefer using their modern counterparts in the core modules.
 */
export * from "./ecs/ComponentCloner";
export * from "./systems/BaseGameStateSystem";
export * from "./utils/InputUtils";
export * from "./utils/Juice";
export * from "./utils/DebugManager";
export * from "./network/BinaryCompression";
export * from "./runtime/IGame";

// Debug
export * from "./debug/ReplayRecorder";
export * from "./debug/StateHasher";
export * from "./debug/SystemProfiler";

// UI Engine
export * from "./ui/UITypes";
export * from "./ui/UIFactory";
export * from "./ui/UIInputSystem";
export * from "./ui/UILayoutSystem";
export * from "./ui/UIRenderer";
export * from "./ui/UITweenSystem";
export * from "./ui/DamageNumberSystem";

// Additional Utils
export * from "./utils/SaveSystem";
export * from "./utils/ProjectileUtils";
<<<<<<< HEAD
export * from "./utils/ConfigService";
=======
>>>>>>> 93349d556c08ba34cd14983bf284c3a8e1459376

// Test Utils
export * from "./test-utils/createTestWorld";

// Core Types aliases
export * from "./ecs/Component";
export * from "./utils/VisualRandom";
<<<<<<< HEAD

// Server-side Network Utils
export * from "./network/InterestManagerSystem";
export * from "./network/ReplicationStateTracker";
export * from "./network/ClientAckTracker";
export * from "./network/NetworkDeltaSystem";
export * from "./network/NetworkBudgetManager";
=======
>>>>>>> 93349d556c08ba34cd14983bf284c3a8e1459376
