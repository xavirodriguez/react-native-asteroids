import { Entity } from "../core/Entity";

export * from "../core/Component";
export * from "../core/Entity";
export * from "../core/CoreComponents";
export * from "../physics/shapes/ShapeTypes";
export * from "./CommonTypes";
export { Transform, RenderableComponent, ColliderComponent, PositionComponent, ScreenShake } from "../legacy/LegacyComponents";
export { CollisionManifold } from "../physics/collision/CollisionTypes";

/**
 * Represents a serialized component, containing only data and no functions or circular references.
 */
export type SerializedComponent = Record<string, unknown>;

/**
 * Represents a map of component types to their respective entity-component data.
 */
export type ComponentDataSnapshot = Record<string, Record<Entity, SerializedComponent>>;

/**
 * Represents a complete snapshot of the ECS world state.
 */
export interface WorldSnapshot {
  entities: Entity[];
  componentData: ComponentDataSnapshot;
  nextEntityId: number;
  freeEntities: Entity[];
  version: number;
  seed: number;
}
