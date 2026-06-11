import { World } from "../index";

/**
 * Utility for generating hashes of the ECS world state.
 * Designed to assist in detecting potential desynchronizations (desync) in multiplayer
 * or replay environments.
 *
 * @responsibility Serialize and hash the serializable state of all active entities and components.
 * @conceptualRisk [JSON_DETERMINISM] Native `JSON.stringify` does not guarantee a deterministic
 * order of object properties across all JavaScript versions or engines. If two clients
 * possess identical data but properties were inserted in a different order, the
 * resulting hashes may differ, potentially causing **false desync positives**.
 * @conceptualRisk [FLOAT_PRECISION] Slight differences in floating-point calculations
 * across different architectures (e.g., x86 vs. ARM) or engines may cause serialized
 * representations to diverge, potentially resulting in hash discrepancies.
 */
export class StateHasher {
  /**
   * Generates a hash representing the current state of all entities and their components.
   *
   * @param world - The ECS world to hash.
   * @returns A hexadecimal string representing the state hash.
   *
   * @remarks
   * @warning **Performance**: This is a costly O(E * C) operation where E is the number of
   * entities and C is the average number of components per entity. It should be used
   * sparingly, preferably outside the simulation or rendering hot paths.
   *
   * @remarks
   * For the hash to be valid, the world state should not be in the process of
   * modification (e.g., in the middle of an update cycle).
   *
   * @conceptualRisk [PERFORMANCE] Massive string concatenation and the use of `JSON.stringify`
   * increases garbage collector (GC) pressure and may negatively impact performance.
   */
  public static calculateHash(world: World): string {
    const entities = [...world.getAllEntities()].sort((a, b) => a - b);
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
