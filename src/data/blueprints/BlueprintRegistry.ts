import { EntityBlueprint } from './types/BlueprintTypes';
import { EnemyBlueprints } from './EnemyBlueprints';

/**
 * Registry for all entity blueprints.
 * Provides O(1) access and maintains pre-compiled property lists (copy plans)
 * to ensure zero-allocation hydration in the hot path.
 */
export class BlueprintRegistry {
  private static readonly blueprints = new Map<string, EntityBlueprint>(
    Object.entries(EnemyBlueprints)
  );

  /**
   * Pre-calculated property keys for each component section to avoid Object.keys() in hot paths.
   */
  private static readonly copyPlans = new Map<string, string[]>();

  static {
    // Pre-compile copy plans for common sections
    // We do this once at startup (cold path)
    const sections = ['render', 'physics', 'collision', 'stats', 'asteroid', 'invader', 'ufo', 'projectile'];

    this.blueprints.forEach((blueprint) => {
      sections.forEach((section) => {
        const data = (blueprint as any)[section];
        if (data && typeof data === 'object') {
          const planKey = `${blueprint.id}:${section}`;
          this.copyPlans.set(planKey, Object.keys(data));
        }
      });
    });
  }

  static get(id: string): EntityBlueprint {
    const blueprint = this.blueprints.get(id);
    if (!blueprint) {
      throw new Error(`Blueprint not found: ${id}`);
    }
    return blueprint;
  }

  static getCopyPlan(blueprintId: string, section: string): string[] | undefined {
    return this.copyPlans.get(`${blueprintId}:${section}`);
  }

  /**
   * Returns a list of ALL properties that should be reset on a component
   * when it is recycled.
   */
  static getResetProperties(compType: string): string[] {
    // This could be hardcoded per component type for maximum performance
    const common = ["type"];
    const specifics: Record<string, string[]> = {
      "Transform": ["x", "y", "rotation", "scaleX", "scaleY", "worldX", "worldY", "worldRotation", "worldScaleX", "worldScaleY", "parentEntity", "dirty"],
      "Velocity": ["dx", "dy", "vAngle"],
      "Render": ["shape", "size", "color", "rotation", "angularVelocity", "zIndex", "hitFlashFrames", "data"],
      "Collider2D": ["shape", "layer", "mask", "isTrigger", "enabled", "offsetX", "offsetY"],
      "Health": ["current", "max", "invulnerableRemaining"],
      "Tag": ["tags"],
      "TTL": ["remaining", "total", "onCompleteEvent"],
      "Boundary": ["width", "height", "behavior", "x", "y"],
      "SpatialNode": ["lastCellKeys", "active", "isStatic"],
      "EnemyTag": ["blueprintId", "variant", "level", "behavior"],
      "Asteroid": ["size", "splitsInto", "splitCount"],
      "Bullet": ["ownerId"]
    };
    return specifics[compType] || common;
  }

  static getAll(): ReadonlyMap<string, EntityBlueprint> {
    return this.blueprints;
  }

  static exists(id: string): boolean {
    return this.blueprints.has(id);
  }
}
