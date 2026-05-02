import { System } from "../core/System";
import { World } from "../core/World";
import { TransformComponent } from "../core/CoreComponents";
import { SpatialHash } from "../physics/collision/SpatialHash";
import { ShipComponent } from "../../games/asteroids/types/AsteroidTypes";
import { InterestedEntity } from "./types/ReplicationTypes";
import { InterestManager } from "./InterestManager";

/**
 * Sistema encargado de calcular la relevancia de las entidades para cada cliente conectado.
 *
 * @responsibility Determinar qué entidades son relevantes para cada jugador basándose en proximidad espacial.
 *
 * @remarks
 * Implementa una estrategia de "Interest Management" (Gestión de Interés) para reducir
 * el tráfico de red enviando solo lo que el jugador puede ver o lo que le afecta directamente.
 * Este sistema puebla el recurso "DetailedInterestMap", utilizado por el servidor para filtrar actualizaciones.
 *
 * ### Niveles de Interés:
 * - **Critical**: Entidades inmediatas o el propio jugador. Replicación prioritaria.
 * - **High**: Entidades dentro del radio visual. Replicación frecuente.
 * - **Medium/Low**: Entidades lejanas. Replicación con tasa de envío reducida (throttling).
 *
 * @conceptualRisk [SCALE][MEDIUM] A medida que aumenta el número de jugadores, la consulta
 * por cada uno de ellos se vuelve más costosa.
 */
export class InterestManagerSystem extends System {
  public update(world: World, _deltaTime: number): void {
    // Note: In this codebase, SpatialGrid is the resource name used in AsteroidsRoom.
    // SpatialGrid is a more modern version of SpatialHash used in this engine's USSC.
    const grid = world.getResource<any>("SpatialGrid");
    if (!grid) return;

    const detailedInterestMap = new Map<string, InterestedEntity[]>();
    const simpleInterestMap = new Map<string, Set<number>>();

    const players = world.query("Ship", "Transform");

    for (const playerEntity of players) {
      const ship = world.getComponent<ShipComponent>(playerEntity, "Ship");
      if (!ship || !ship.sessionId) continue;

      const playerTransform = world.getComponent<TransformComponent>(playerEntity, "Transform")!;
      const sessionId = ship.sessionId;
      const interested: InterestedEntity[] = [];
      const interestedIds = new Set<number>();

      // We use the maximum interest radius to query the grid
      const queryAABB = {
        minX: playerTransform.x - InterestManager.LOW_RADIUS,
        maxX: playerTransform.x + InterestManager.LOW_RADIUS,
        minY: playerTransform.y - InterestManager.LOW_RADIUS,
        maxY: playerTransform.y + InterestManager.LOW_RADIUS,
      };

      const candidates = new Set<number>();
      grid.query(queryAABB, candidates);

      for (const entityId of candidates) {
        const transform = world.getComponent<TransformComponent>(entityId, "Transform");
        if (!transform) continue;

        const dx = transform.x - playerTransform.x;
        const dy = transform.y - playerTransform.y;
        const distanceSq = dx * dx + dy * dy;

        const level = InterestManager.getInterestLevelSq(distanceSq);
        if (level !== 'none') {
          interested.push({
            entityId,
            interestLevel: level,
            distance: Math.sqrt(distanceSq)
          });
          interestedIds.add(entityId);
        }
      }

      // Always include self as critical
      if (!interestedIds.has(playerEntity)) {
          interested.push({
              entityId: playerEntity,
              interestLevel: 'critical',
              distance: 0
          });
          interestedIds.add(playerEntity);
      }

      detailedInterestMap.set(sessionId, interested);
      simpleInterestMap.set(sessionId, interestedIds);
    }

    world.setResource("DetailedInterestMap", detailedInterestMap);
    world.setResource("InterestMap", simpleInterestMap);
  }
}
