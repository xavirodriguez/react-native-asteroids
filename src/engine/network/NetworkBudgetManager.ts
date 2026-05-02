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
   * Filters and prioritizes entities based on the client's budget.
   *
   * @remarks
   * Estimates byte size for different entity types to respect maxBytesPerPacket (Hallazgo 7).
   */
  public prioritize(
    clientId: string,
    entities: InterestedEntity[],
    budget: ClientNetworkBudget = NetworkBudgetManager.DEFAULT_BUDGET
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

    // Heuristic: estimated bytes per entity based on level
    const bytesPerEntity: Record<string, number> = { 'critical': 200, 'high': 150, 'medium': 100, 'low': 100, 'none': 0 };

    // 2. Add Critical (within budget)
    let count = 0;
    for (const e of critical) {
      const estimated = bytesPerEntity[e.interestLevel];
      if (count < budget.maxEntitiesPerPacket &&
          count < budget.maxCriticalPerTick &&
          currentBytes + estimated < budget.maxBytesPerPacket) {
        result.push(e);
        count++;
        currentBytes += estimated;
      }
    }

    // 3. Add High
    for (const e of high) {
      const estimated = bytesPerEntity[e.interestLevel];
      if (count < budget.maxEntitiesPerPacket && currentBytes + estimated < budget.maxBytesPerPacket) {
        result.push(e);
        count++;
        currentBytes += estimated;
      }
    }

    // 4. Add Medium
    for (const e of medium) {
      const estimated = bytesPerEntity[e.interestLevel];
      if (count < budget.maxEntitiesPerPacket && currentBytes + estimated < budget.maxBytesPerPacket) {
        result.push(e);
        count++;
        currentBytes += estimated;
      }
    }

    // 5. Add Low (rotating)
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
