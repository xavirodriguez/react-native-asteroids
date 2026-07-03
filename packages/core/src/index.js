"use strict";
/**
 * @packageDocumentation
 * TinyAster Core: A lightweight, extensible ECS engine designed for
 * arcade-style games.
 *
 * @remarks
 * This package provides the foundational building blocks for entities,
 * components, systems, and world management. It is intended to support
 * reproducible simulations under controlled conditions (e.g., fixed timestep,
 * seeded RNG, and avoidance of asynchronous side effects in core logic).
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
// ECS Core
__exportStar(require("./ecs/Entity"), exports);
__exportStar(require("./ecs/Component"), exports);
__exportStar(require("./ecs/World"), exports);
__exportStar(require("./ecs/Query"), exports);
__exportStar(require("./ecs/System"), exports);
__exportStar(require("./ecs/WorldCommandBuffer"), exports);
__exportStar(require("./ecs/BlueprintRegistry"), exports);
__exportStar(require("./ecs/CoreComponents"), exports);
__exportStar(require("./ecs/TagComponent"), exports);
__exportStar(require("./snapshots/WorldSnapshot"), exports);
__exportStar(require("./ecs/ComponentCloner"), exports);
// Events
__exportStar(require("./events/EventBus"), exports);
// Input
__exportStar(require("./input/InputSystem"), exports);
__exportStar(require("./input/UnifiedInputSystem"), exports);
// Loop & Runtime
__exportStar(require("./loop/GameLoop"), exports);
__exportStar(require("./loop/FrameScheduler"), exports);
__exportStar(require("./runtime/BaseGame"), exports);
__exportStar(require("./runtime/IGame"), exports);
// Assets & Audio
__exportStar(require("./assets/AssetLoader"), exports);
__exportStar(require("./audio/IAudioPlayer"), exports);
// Physics
__exportStar(require("./physics/systems/MovementSystem"), exports);
__exportStar(require("./physics/systems/FrictionSystem"), exports);
__exportStar(require("./physics/systems/BoundarySystem"), exports);
__exportStar(require("./physics/collision/CollisionSystems"), exports);
__exportStar(require("./physics/collision/CollisionTypes"), exports);
__exportStar(require("./physics/utils/PhysicsUtils"), exports);
__exportStar(require("./physics/shapes/Shapes"), exports);
__exportStar(require("./physics/query/PhysicsQuery"), exports);
__exportStar(require("./physics/dynamics/PhysicsIntegrateSystem"), exports);
__exportStar(require("./physics/dynamics/PhysicsSolveSystem"), exports);
// Rendering
__exportStar(require("./rendering/Renderer"), exports);
__exportStar(require("./rendering/RenderTypes"), exports);
__exportStar(require("./rendering/RenderSnapshot"), exports);
__exportStar(require("./rendering/RenderCommandBuffer"), exports);
__exportStar(require("./rendering/Camera2D"), exports);
// Systems
__exportStar(require("./systems/BaseGameStateSystem"), exports);
__exportStar(require("./systems/JuiceSystem"), exports);
__exportStar(require("./systems/TTLSystem"), exports);
__exportStar(require("./systems/SpatialPartitioningSystem"), exports);
__exportStar(require("./systems/RenderUpdateSystem"), exports);
__exportStar(require("./systems/ParticleSystem"), exports);
__exportStar(require("./systems/JoystickSystem"), exports);
__exportStar(require("./systems/AnimationSystem"), exports);
__exportStar(require("./systems/FeedbackSystem"), exports);
__exportStar(require("./systems/HierarchySystem"), exports);
__exportStar(require("./systems/AbstractHierarchySystem"), exports);
__exportStar(require("./systems/MutatorSystem"), exports);
__exportStar(require("./systems/ScreenShakeSystem"), exports);
__exportStar(require("./systems/StateMachineSystem"), exports);
__exportStar(require("./systems/TilemapRenderSystem"), exports);
// Network
__exportStar(require("./network/NetworkTransport"), exports);
__exportStar(require("./network/NetworkManager"), exports);
__exportStar(require("./network/ReplicationSystem"), exports);
__exportStar(require("./network/MultiplayerSystems"), exports);
// Config
__exportStar(require("./config/ConfigService"), exports);
__exportStar(require("./config/BaseConfigSchema"), exports);
// Utils
__exportStar(require("./utils/RandomService"), exports);
__exportStar(require("./utils/Juice"), exports);
