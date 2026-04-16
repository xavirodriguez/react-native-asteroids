/**
 * @packageDocumentation
 * Deterministic world state hashing for desync detection.
 * Provides utilities to generate compact fingerprints of the entire ECS world state.
 */

import { World } from "../core/World";

/**
 * Utility for generating deterministic hashes of the full ECS world state.
 * Fundamental for desynchronization (desync) detection in multiplayer or replay environments.
 *
 * @remarks
 * This class implements a deep traversal of the ECS world, collecting data from all
 * active entities and their components. The resulting string is hashed using a
 * 32-bit integer algorithm (similar to Java's `String.hashCode()`).
 *
 * @responsibility Serialize and hash the state of all active entities and components.
 *
 * @conceptualRisk [JSON_DETERMINISM] `JSON.stringify` does not guarantee property order.
 * If two clients have the same data but properties were inserted in a different order,
 * the hashes will differ (false positive desync).
 * @conceptualRisk [FLOAT_PRECISION] Tiny floating-point differences between architectures
 * (e.g., x86 vs ARM) can cause the serialized string to differ and the hash to fail.
 * @conceptualRisk [PERFORMANCE] Massive string concatenation and the use of `JSON.stringify`
 * generates significant pressure on the Garbage Collector (GC).
 */
export class StateHasher {
  /**
   * Generates a hash representing the current state of all entities and their components.
   *
   * @param world - The ECS world to hash.
   * @returns A hexadecimal string representing the state hash.
   *
   * @remarks
   * PERFORMANCE WARNING: This is a costly O(E * C) operation, where E is the number of entities
   * and C is the average number of components. Use sparingly, ideally outside the critical
   * rendering path (e.g., every 60 ticks or only when a desync is suspected).
   *
   * The method explicitly sorts entities and component types to improve determinism.
   *
   * @precondition The world must not be in the process of modification (mid-update).
   */
  public static calculateHash(world: World): string {
    const entities = world.getAllEntities().sort((a, b) => a - b);
    let stateString = "";

    for (const entity of entities) {
      stateString += `e:${entity}[`;
      const types = world.getEntityComponentTypes(entity).sort();
      for (const type of types) {
        const comp = world.getComponent(entity, type);
        if (comp) {
          // In production, use a more efficient binary serialization
          stateString += `${type}:${JSON.stringify(comp)},`;
        }
      }
      stateString += "]|";
    }

    return this.hashString(stateString);
  }

  /**
   * Internal implementation of a 32-bit string hashing algorithm.
   *
   * @param str - The serialized state string.
   * @returns Hexadecimal representation of the calculated hash.
   */
  private static hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return hash.toString(16);
  }
}
