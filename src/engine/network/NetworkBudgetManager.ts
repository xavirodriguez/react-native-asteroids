import { InterestedEntity, ClientNetworkBudget } from "./types/ReplicationTypes";

/**
 * Sistema encargado de gestionar el presupuesto de ancho de banda para la replicación de red.
 *
 * @responsibility Priorizar y filtrar entidades para mantenerse dentro de los límites de red.
 *
 * @remarks
 * Este manager prioriza las entidades basándose en su nivel de interés espacial
 * y asegura que el tamaño total de los paquetes no exceda los límites configurados.
 *
 * ### Algoritmo de Selección:
 * 1. **Filtro Crítico**: Entidades marcadas como 'critical' se incluyen siempre que haya espacio.
 * 2. **Priorización por Nivel**: Se asignan bytes restantes a niveles High, Medium y Low en ese orden.
 * 3. **Rotación (Fairness)**: Para las entidades de baja prioridad (Low), se utiliza un sistema
 *    de rotación circular para garantizar que todas reciban actualizaciones eventualmente, incluso
 *    si el ancho de banda es limitado.
 */
export class NetworkBudgetManager {
  private lowPriorityRotation = new Map<string, number>(); // clientId -> startIndex

  public static readonly DEFAULT_BUDGET: ClientNetworkBudget = {
    maxBytesPerPacket: 8192, // 8KB
    maxEntitiesPerPacket: 50,
    maxCriticalPerTick: 20,
    maxLowPriorityPerSecond: 5, // Approx. 5 every 60 ticks
  };

  /**
   * Filters and prioritizes entities based on the client's network budget.
   *
   * @remarks
   * Implements a strict prioritization hierarchy to handle bandwidth constraints:
   * 1. **Self Player**: Always prioritized to ensure the local user has the best feedback.
   * 2. **Critical Radius**: Entities within the immediate vicinity of the player.
   * 3. **High/Medium/Low**: Distance-based selection and rotation.
   *
   * The method estimates the byte size of each entity (Critical: 200B, High: 150B, etc.)
   * to respect the `maxBytesPerPacket` limit (default 8KB).
   *
   * @param clientId - Target client ID.
   * @param entities - List of entities currently in interest.
   * @param budget - Bandwidth limits.
   * @param selfEntityId - ID of the client's own ship.
   * @returns Filtered list of entities that fit within the current packet budget.
   */
  public prioritize(
    clientId: string,
    entities: InterestedEntity[],
    budget: ClientNetworkBudget = NetworkBudgetManager.DEFAULT_BUDGET,
    selfEntityId?: string
  ): InterestedEntity[] {
    const result: InterestedEntity[] = [];
    let currentBytes = 0;
    // Base packet overhead (headers, sequence, etc.)
    const ESTIMATED_OVERHEAD = 256;
    currentBytes += ESTIMATED_OVERHEAD;

    // 1. Sort by importance level
    const importanceOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3, 'none': 4 };
    const sorted = [...entities].sort((a, b) => {
      if (a.interestLevel !== b.interestLevel) {
        return importanceOrder[a.interestLevel] - importanceOrder[b.interestLevel];
      }
      return a.distance - b.distance;
    });

    const critical = sorted.filter(e => e.interestLevel === 'critical');
    const high = sorted.filter(e => e.interestLevel === 'high');
    const medium = sorted.filter(e => e.interestLevel === 'medium');
    const low = sorted.filter(e => e.interestLevel === 'low');

    // Heuristic: estimated bytes per entity based on level (including components and overhead)
    const bytesPerEntity: Record<string, number> = { 'critical': 200, 'high': 150, 'medium': 100, 'low': 100, 'none': 0 };

    // 2. Add Self Entity first (Hallazgo 7 / Prioridad 1)
    let count = 0;
    if (selfEntityId) {
        const self = entities.find(e => e.entityId === selfEntityId);
        if (self) {
            result.push(self);
            count++;
            currentBytes += bytesPerEntity[self.interestLevel] || 200;
        }
    }

    // 3. Add Critical (within budget)
    for (const e of critical) {
      if (e.entityId === selfEntityId) continue; // Already added
      const estimated = bytesPerEntity[e.interestLevel];
      if (count < budget.maxEntitiesPerPacket &&
          count < budget.maxCriticalPerTick &&
          currentBytes + estimated < budget.maxBytesPerPacket) {
        result.push(e);
        count++;
        currentBytes += estimated;
      }
    }

    // 4. Add High
    for (const e of high) {
      if (e.entityId === selfEntityId) continue; // Already added
      const estimated = bytesPerEntity[e.interestLevel];
      if (count < budget.maxEntitiesPerPacket && currentBytes + estimated < budget.maxBytesPerPacket) {
        result.push(e);
        count++;
        currentBytes += estimated;
      }
    }

    // 5. Add Medium
    for (const e of medium) {
      if (e.entityId === selfEntityId) continue; // Already added
      const estimated = bytesPerEntity[e.interestLevel];
      if (count < budget.maxEntitiesPerPacket && currentBytes + estimated < budget.maxBytesPerPacket) {
        result.push(e);
        count++;
        currentBytes += estimated;
      }
    }

    // 6. Add Low (rotating)
    if (count < budget.maxEntitiesPerPacket && low.length > 0) {
      const startIndex = this.lowPriorityRotation.get(clientId) ?? 0;
      const amountToTry = Math.min(budget.maxLowPriorityPerSecond, budget.maxEntitiesPerPacket - count, low.length);

      let addedLow = 0;
      for (let i = 0; i < amountToTry; i++) {
        const index = (startIndex + i) % low.length;
        const e = low[index];
        const estimated = bytesPerEntity[e.interestLevel];

        if (currentBytes + estimated < budget.maxBytesPerPacket) {
            result.push(e);
            count++;
            currentBytes += estimated;
            addedLow++;
        } else {
            break;
        }
      }

      this.lowPriorityRotation.set(clientId, (startIndex + addedLow) % low.length);
    }

    return result;
  }
}
