import { World } from "../core/World";

/**
 * Utilidad para generar hashes del estado del mundo ECS.
 * Fundamental para ayudar en la detección de desincronización (desync) en entornos multijugador o replay.
 *
 * @responsibility Serializar y hashear el estado serializable de todas las entidades y componentes activos.
 * @conceptualRisk [JSON_DETERMINISM] `JSON.stringify` no garantiza el orden de las propiedades de los objetos.
 * Si dos clientes tienen los mismos datos pero las propiedades del objeto se insertaron en orden distinto,
 * los hashes diferirán (falso positivo de desync).
 * @conceptualRisk [FLOAT_PRECISION] Diferencias minúsculas en cálculos de punto flotante entre arquitecturas
 * (ej. x86 vs ARM) pueden causar que el string serializado difiera y el hash falle.
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
   * @precondition El mundo no debe estar en proceso de modificación (mitad de un update).
   *
   * @conceptualRisk [PERFORMANCE] La concatenación masiva de strings y el uso de `JSON.stringify` genera
   * mucha presión sobre el recolector de basura (GC).
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
