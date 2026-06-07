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
export * from "./rendering/RenderTypes";
export * from "./rendering/RenderSnapshot";
export * from "./rendering/RenderCommandBuffer";
export * from "./rendering/Camera2D";

// Network
export * from "./network/NetworkTransport";

// Input
export * from "./input/UnifiedInputSystem";

// Scenes
export * from "./scenes/Scene";
export * from "./scenes/SceneManager";

// Additional exports for compatibility and migration
export * from "./ecs/ComponentCloner";
export * from "./systems/BaseGameStateSystem";
export * from "./utils/InputUtils";
export * from "./utils/Juice";
export * from "./utils/DebugManager";
export * from "./network/BinaryCompression";
export * from "./runtime/IGame";
