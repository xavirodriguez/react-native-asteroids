import Matter from "matter-js";
import { World } from "../core/World";
import { TagComponent } from "../core/types/CoreTypes";

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
export class CollisionRouter {
  private rules = new Map<string, CollisionRule[]>();

  constructor(private engine: Matter.Engine) {
    this.setupListeners();
  }

  /**
   * Register a rule for a specific collision type (e.g., "player_hit_enemy").
   */
  registerRule(type: string, rule: CollisionRule): void {
    if (!this.rules.has(type)) {
      this.rules.set(type, []);
    }
    this.rules.get(type)?.push(rule);
  }

  private setupListeners(): void {
    Matter.Events.on(this.engine, "collisionStart", (event) => {
      event.pairs.forEach((pair) => {
        this.routeCollision(pair, "collisionStart");
      });
    });

    Matter.Events.on(this.engine, "collisionActive", (event) => {
      event.pairs.forEach((pair) => {
        this.routeCollision(pair, "collisionActive");
      });
    });

    Matter.Events.on(this.engine, "collisionEnd", (event) => {
      event.pairs.forEach((pair) => {
        this.routeCollision(pair, "collisionEnd");
      });
    });
  }

  private routeCollision(pair: Matter.Pair, eventType: string): void {
    const entityAId = parseInt(pair.bodyA.label);
    const entityBId = parseInt(pair.bodyB.label);

    if (isNaN(entityAId) || isNaN(entityBId)) return;

    // Dispatch raw collision event
    const rawEvent: CollisionEvent = {
      type: eventType,
      entityAId,
      entityBId,
      pair,
    };

    // Emit specialized gameplay events based on tags (implemented in gameplay systems)
    this.rules.get(eventType)?.forEach((rule) => rule(rawEvent));
  }

  /**
   * Helper to identify if a collision involves specific entity tags.
   */
  hasTags(world: World, entityId: number, ...tags: string[]): boolean {
    const tagComp = world.getComponent<TagComponent>(entityId, "Tag");
    if (!tagComp) return false;
    return tags.every((tag) => tagComp.tags.includes(tag));
  }
}
