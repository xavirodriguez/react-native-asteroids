import { InterestLevel } from "./types/ReplicationTypes";

/**
 * Utility for determining interest levels based on distance.
 */
export class InterestManager {
  /**
   * Radius for 'critical' interest level (e.g. immediate threats, owner)
   */
  public static readonly CRITICAL_RADIUS = 200;
  /**
   * Radius for 'high' interest level (e.g. nearby objects)
   */
  public static readonly HIGH_RADIUS = 500;
  /**
   * Radius for 'medium' interest level (e.g. objects in general proximity)
   */
  public static readonly MEDIUM_RADIUS = 1000;
  /**
   * Radius for 'low' interest level (e.g. far objects)
   */
  public static readonly LOW_RADIUS = 2000;

  /**
   * Calculates the interest level based on squared distance.
   * Optimization: Avoids expensive Math.sqrt calls.
   */
  public static getInterestLevelSq(distanceSq: number): InterestLevel {
    if (distanceSq < this.CRITICAL_RADIUS * this.CRITICAL_RADIUS) return 'critical';
    if (distanceSq < this.HIGH_RADIUS * this.HIGH_RADIUS) return 'high';
    if (distanceSq < this.MEDIUM_RADIUS * this.MEDIUM_RADIUS) return 'medium';
    if (distanceSq < this.LOW_RADIUS * this.LOW_RADIUS) return 'low';
    return 'none';
  }

  /**
   * Calculates the interest level based on distance.
   */
  public static getInterestLevel(distance: number): InterestLevel {
    return this.getInterestLevelSq(distance * distance);
  }
}
