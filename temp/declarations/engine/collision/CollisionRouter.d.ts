import Matter from "matter-js";
import { World } from "../core/World";
export interface CollisionEvent {
    type: string;
    entityAId: number;
    entityBId: number;
    pair: Matter.Pair;
}
export type CollisionRule = (event: CollisionEvent) => void;
/**
 * CollisionRouter: Translates raw Matter.js collisions into semantic gameplay events.
 */
export declare class CollisionRouter {
    private engine;
    private rules;
    constructor(engine: Matter.Engine);
    /**
     * Register a rule for a specific collision type (e.g., "player_hit_enemy").
     */
    registerRule(type: string, rule: CollisionRule): void;
    private setupListeners;
    private routeCollision;
    /**
     * Helper to identify if a collision involves specific entity tags.
     */
    hasTags(world: World, entityId: number, ...tags: string[]): boolean;
}
