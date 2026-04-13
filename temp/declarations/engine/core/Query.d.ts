import { Entity } from "../types/EngineTypes";
/**
 * Consulta reactiva que mantiene un índice actualizado de entidades con una firma de
 * componentes específica.
 *
 * @remarks
 * Las queries eliminan la necesidad de iterar sobre todas las entidades del mundo en cada frame.
 * El {@link World} notifica a las queries relevantes solo cuando hay cambios estructurales
 * (add/remove componente), permitiendo una complejidad O(1) para obtener entidades activas.
 *
 * @packageDocumentation
 */
export declare class Query {
    readonly componentTypes: string[];
    private entities;
    private entityArray;
    private needsUpdateArray;
    /**
     * Inicializa una query para una firma de componentes determinada.
     *
     * @param componentTypes - Lista de tipos de componentes que definen la firma.
     */
    constructor(componentTypes: string[]);
    /**
     * Comprueba si una entidad debe formar parte de esta query basado en sus componentes.
     *
     * @param entityComponents - El conjunto de tipos de componentes que posee la entidad.
     * @returns `true` si la entidad posee TODOS los tipos de componentes requeridos.
     */
    matches(entityComponents: Set<string>): boolean;
    /**
     * Añade una entidad al resultado de la query si no está presente.
     *
     * @param entity - La entidad a añadir.
     * @postcondition Si la entidad era nueva, marca {@link Query.needsUpdateArray} como `true`.
     */
    add(entity: Entity): void;
    /**
     * Elimina una entidad del resultado de la query.
     *
     * @param entity - La entidad a eliminar.
     * @postcondition Si la entidad estaba presente, marca {@link Query.needsUpdateArray} como `true`.
     */
    remove(entity: Entity): void;
    /**
     * Devuelve la lista de entidades que coinciden con la query.
     * Devuelve un array cacheado para minimizar la presión del GC.
     *
     * @remarks
     * El array devuelto es una referencia a un caché interno. No debe ser modificado por el
     * consumidor (e.g. mediante `.sort()` o `.push()`).
     *
     * @returns Un array de IDs de {@link Entity}.
     * @postcondition El array devuelto refleja el estado actual del {@link World} para esta firma.
     * @conceptualRisk [MUTABLE_CACHE_LEAK][MEDIUM] Si un consumidor modifica el array devuelto
     * (e.g., mediante `.push()` o `.sort()` in-place), corromperá el estado interno de la Query.
     */
    getEntities(): Entity[];
    /**
     * Devuelve la clave única para esta query basada en los tipos de componentes.
     *
     * @remarks
     * La clave es una cadena separada por comas y ordenada alfabéticamente de los tipos
     * de componentes, garantizando que el orden de entrada no genere duplicados.
     */
    get key(): string;
    /**
     * Rebuilds the query results from scratch.
     * Used during world restoration to ensure consistency without breaking references.
     */
    rebuild(allEntities: Set<Entity>, entityComponentSets: Map<Entity, Set<string>>): void;
}
