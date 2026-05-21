import { World } from "../../../engine/core/World";

export function getLogicalSnapshot(world: World) {
  const snapshot = world.snapshot();
  const gameplayEntities = ["Ship", "Asteroid", "Bullet", "Ufo"];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filteredComponentData: Record<string, any> = {};
  const relevantComponents = ["Transform", "Velocity", "Health", "Ship", "Asteroid", "Bullet", "Ufo", "GameState"];

  for (const type of relevantComponents) {
    if (snapshot.componentData[type]) {
      const typeData = snapshot.componentData[type];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filteredTypeData: Record<string, any> = {};

      for (const id in typeData) {
        const comp = typeData[id];
        const filteredComp = { ...comp };

        // Remove presentation-only fields from GameState
        if (type === "GameState") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          delete (filteredComp as any).stars;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          delete (filteredComp as any).screenShake;
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

  return {
    entities: Array.from(gameplayEntityIds).sort((a, b) => a - b),
    componentData: filteredComponentData,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    serverTick: (world.getSingleton("GameState") as any)?.serverTick || 0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    score: (world.getSingleton("GameState") as any)?.score || 0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    level: (world.getSingleton("GameState") as any)?.level || 0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gameOver: (world.getSingleton("GameState") as any)?.isGameOver || false,
  };
}
