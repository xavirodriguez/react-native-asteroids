import { World } from "../../../packages/core/src/ecs/World";

/**
 * Helper to create a World instance with common resources for testing.
 */
export function createTestWorld(config?: { resources?: Record<string, unknown> }): World {
  const world = new World();
  if (config?.resources) {
    for (const [name, resource] of Object.entries(config.resources)) {
      world.setResource(name, resource);
    }
  }
  return world;
}
