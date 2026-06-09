import { World } from "../index";

/**
 * Utilidad para generar hashes del estado del mundo ECS.
 * Diseñado para ayudar en la detección de posibles desincronizaciones (desync) en entornos multijugador o replay.
 *
 * @responsibility Serializar y hashear el estado serializable de todas las entidades y componentes activos.
 * @conceptualRisk [JSON_DETERMINISM] El `JSON.stringify` nativo no garantiza un orden determinista
 * de las propiedades de los objetos en todas las circunstancias. Si dos clientes poseen datos
 * idénticos pero las propiedades se insertaron en distinto orden, los hashes resultantes pueden
 * diferir, lo que podría provocar **falsos positivos de desincronización**.
 * @conceptualRisk [FLOAT_PRECISION] Pequeñas diferencias en cálculos de punto flotante
 * entre distintas arquitecturas (ej. x86 vs ARM) o motores pueden causar que las
 * representaciones serializadas diverjan, resultando potencialmente en discrepancias de hash.
 */
export class StateHasher {
  /**
   * Genera un hash que representa el estado actual de todas las entidades y sus componentes.
   *
   * @param world - El mundo ECS a hashear.
   * @returns Un string hexadecimal representando el hash del estado.
   *
   * @remarks
   * PERFORMANCE WARNING: Esta es una operación costosa O(E * C) donde E es el número de entidades
   * y C el promedio de componentes. Debe usarse con moderación, preferiblemente fuera del hot path de renderizado.
   *
   * @remarks
   * Para que el hash sea válido, el estado del mundo no debería estar en proceso de modificación
   * (ej. en mitad de un ciclo de actualización).
   *
 * @conceptualRisk [PERFORMANCE] La concatenación masiva de strings y el uso de `JSON.stringify`
 * incrementa la presión sobre el recolector de basura (GC) y puede impactar el rendimiento.
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
