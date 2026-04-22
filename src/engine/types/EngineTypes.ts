import { Entity } from "../core/Entity";

export * from "../core/Component";
export * from "../core/Entity";
export * from "../core/CoreComponents";
export * from "../physics/shapes/ShapeTypes";
export * from "./CommonTypes";
export { CollisionManifold } from "../physics/collision/CollisionTypes";

/**
 * Represents a serialized component, ideally containing only flat data.
 */
export type SerializedComponent = Record<string, unknown>;

/**
 * Represents a map of component types to their respective entity-component data.
 */
export type ComponentDataSnapshot = Record<string, Record<Entity, SerializedComponent>>;

/**
 * Represents a snapshot of the ECS world state oriented towards serialization.
 */
export interface WorldSnapshot {
  entities: Entity[];
  componentData: ComponentDataSnapshot;
  nextEntityId: number;
  freeEntities: Entity[];
  version: number;
  seed: number;
}
