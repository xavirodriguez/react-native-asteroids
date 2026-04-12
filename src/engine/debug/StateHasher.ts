import { World } from "../core/World";

/**
 * Generates a deterministic hash of the world state for desync detection.
 */
export class StateHasher {
  /**
   * Generates a hash representing the current state of all entities and components.
   * PERFORMANCE WARNING: This is a heavy operation. Use only for debugging or desync detection.
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
