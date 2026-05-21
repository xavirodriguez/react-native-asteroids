import { World } from "../../../engine/core/World";

export function getLogicalSnapshot(world: World) {
  const snapshot = world.snapshot();
  const gameplayEntities = ["Ship", "Asteroid", "Bullet", "Ufo"];

  const filteredComponentData: Record<string, Record<string, unknown>> = {};
  const relevantComponents = ["Transform", "Velocity", "Health", "Ship", "Asteroid", "Bullet", "Ufo", "GameState"];

  for (const type of relevantComponents) {
    if (snapshot.componentData[type]) {
      const typeData = snapshot.componentData[type];
      const filteredTypeData: Record<string, unknown> = {};

      for (const id in typeData) {
        const comp = typeData[id];
        const filteredComp = { ...comp };

        // Remove presentation-only fields from GameState
        if (type === "GameState") {
          delete (filteredComp as Record<string, unknown>).stars;
          delete (filteredComp as Record<string, unknown>).screenShake;
        }

        filteredTypeData[id] = filteredComp;
      }

      filteredComponentData[type] = filteredTypeData;
    }
  }

  // Filter entities to only include those that have at least one gameplay component
  const gameplayEntityIds = new Set<number>();
  for (const type of gameplayEntities) {
    if (snapshot.componentData[type]) {
      Object.keys(snapshot.componentData[type]).forEach(id => gameplayEntityIds.add(parseInt(id)));
    }
  }

  const gameState = world.getSingleton<import("../../types/AsteroidTypes").GameStateComponent>("GameState");
  return {
    entities: Array.from(gameplayEntityIds).sort((a, b) => a - b),
    componentData: filteredComponentData,
    serverTick: gameState?.serverTick || 0,
    score: gameState?.score || 0,
    level: gameState?.level || 0,
    gameOver: gameState?.isGameOver || false,
  };
}
