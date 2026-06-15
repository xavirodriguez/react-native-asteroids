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
export * from "./ecs/SnapshotTypes";
export * from "./ecs/ComponentCloner";

// Events
export * from "./events/EventBus";

// Utils
export * from "./utils/RandomService";

export type { DeepReadonly } from "./ecs/Component";
export * from "./network/NetworkTransport";
