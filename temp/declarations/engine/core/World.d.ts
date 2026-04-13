import { Component, Entity } from "../types/EngineTypes";
import { System, SystemConfig } from "./System";
/**
 * Mundo ECS - Registro central que gestiona el ciclo de vida de entidades, componentes y sistemas.
 *
 * @responsibility Gestionar el ciclo de vida de las entidades (creación, destrucción).
 * @responsibility Almacenar y proporcionar acceso eficiente a los componentes.
 * @responsibility Orquestar la ejecución de sistemas en fases específicas.
 * @responsibility Mantener recursos compartidos globales del juego.
 *
 * @remarks
 * El `World` actúa como el núcleo de la arquitectura ECS. Utiliza un pool de entidades para minimizar
 * la presión sobre el GC y emplea queries reactivas cacheadas para optimizar las consultas de sistemas.
 *
 * Invariantes:
 * - **Principio 2**: Las estructuras jerárquicas (Transforms) deben ser válidas; no se permite el auto-parentesco.
 * - **Principio 6**: Los componentes singleton recuperados mediante {@link World.getSingleton} están
 * garantizados como mutables (se realiza una copia si están congelados).
 *
 * @conceptualRisk [PERFORMANCE] Las consultas (queries) sin caché pueden volverse costosas
 * si se realizan múltiples veces por frame en mundos con miles de entidades.
 * @conceptualRisk [CONSISTENCY] La eliminación de componentes durante una iteración
 * de sistema puede invalidar el estado de los iteradores si no se maneja mediante buffers.
 *
 * @packageDocumentation
 */
export declare class World {
    private activeEntities;
    private componentMaps;
    private componentIndex;
    private entityComponentSets;
    private queries;
    private queriesByComponent;
    private systems;
    private sortedSystems;
    private systemsNeedSorting;
    private profilers;
    /** Whether system profiling is enabled. */
    debugMode: boolean;
    private nextEntityId;
    private freeEntities;
    private resources;
    /**
     * Genera una instantánea serializable del estado completo del mundo para rollback o persistencia.
     *
     * @remarks
     * Captura entidades activas, datos de componentes, contadores de IDs, versión del mundo
     * y la semilla actual del generador de números aleatorios de gameplay.
     *
     * @returns Un objeto plano que contiene el estado reconstruible del mundo.
     * @conceptualRisk [JSON_DETERMINISM][MEDIUM] La serialización no garantiza el orden de las
     * propiedades, lo que puede afectar a la generación de hashes de estado.
     */
    snapshot(): any;
    /**
     * Restaura el estado del mundo a partir de una instantánea previamente capturada.
     *
     * @remarks
     * Este método reconstruye todos los mapas de componentes e índices. También garantiza
     * que las queries existentes se invaliden y reconstruyan para mantener la consistencia
     * de los resultados sin romper las referencias a los objetos Query.
     *
     * @param state - El objeto de estado obtenido de {@link World.snapshot}.
     *
     * @precondition El estado proporcionado debe ser una estructura válida generada por el motor.
     * @postcondition El mundo refleja exactamente el estado contenido en la instantánea.
     * @postcondition {@link World.version} se sincroniza con el valor del estado restaurado.
     * @sideEffect Limpia todos los datos actuales del mundo antes de la restauración.
     * @sideEffect Re-inicializa la semilla de `RandomService("gameplay")`.
     */
    restore(state: any): void;
    /**
     * Versión actual de la estructura del mundo.
     * Se incrementa cada vez que se añade o elimina una entidad o componente.
     *
     * @conceptualRisk [POTENTIAL_OVERFLOW][LOW] Si el juego corre por un tiempo extremadamente
     * largo con alta rotación de entidades, la versión podría desbordarse.
     */
    version: number;
    /**
     * Crea una nueva entidad única en el mundo.
     *
     * @remarks
     * Reutiliza IDs de {@link World.freeEntities} si están disponibles para minimizar el
     * crecimiento de IDs y mejorar la localidad de caché en los índices.
     *
     * @returns El ID de la nueva {@link Entity}.
     * @postcondition Incrementa {@link World.version}.
     * @sideEffect Altera la lista interna de entidades activas y el pool de entidades libres.
     */
    createEntity(): Entity;
    /**
     * Elimina todos los sistemas registrados en el mundo.
     *
     * @remarks
     * Útil durante reinicios de escena para reconstruir el pipeline de ejecución.
     *
     * @postcondition La lista de sistemas queda vacía y {@link World.version} se incrementa.
     */
    clearSystems(): void;
    /**
     * Adjunta un componente a una entidad.
     * Si la entidad ya posee un componente de este tipo, será sobrescrito.
     *
     * @remarks
     * Este método gestiona la indexación reactiva para las queries y valida invariantes críticos
     * como las jerarquías de transformación.
     *
     * @param entity - La entidad a la que se adjunta el componente.
     * @param component - La instancia del componente a adjuntar.
     *
     * @precondition La entidad debe existir (haber sido creada previamente con {@link World.createEntity}).
     * @throws {Error} Si se viola el invariante de jerarquía (auto-parentesco).
     * @conceptualRisk [HIERARCHY_NORMALIZATION][LOW] Resetea silenciosamente el parent a undefined
     * si el parent no existe. Previene crashes pero puede ocultar errores de lógica en el orden
     * de creación de entidades.
     *
     * @postcondition Incrementa {@link World.version}.
     * @postcondition Notifica a las queries reactivas para actualizar sus resultados cacheados.
     * @sideEffect Actualiza los mapas de componentes e índices de tipos por entidad.
     */
    addComponent<T extends Component>(entity: Entity, component: T): void;
    /**
     * Recupera un componente de un tipo específico de una entidad.
     *
     * @param entity - La entidad de la que se obtiene el componente.
     * @param type - El nombre del tipo de componente a recuperar.
     * @returns La instancia del componente si existe, de lo contrario `undefined`.
     * @see {@link World.hasComponent}
     */
    getComponent<T extends Component>(entity: Entity, type: string): T | undefined;
    /**
     * Comprueba si una entidad posee un componente de un tipo específico.
     *
     * @param entity - La entidad a comprobar.
     * @param type - El tipo de componente a buscar.
     * @returns `true` si la entidad posee el componente, de lo contrario `false`.
     */
    hasComponent(entity: Entity, type: string): boolean;
    /**
     * Alias de {@link World.query} para soportar interfaces extendidas de ECS.
     *
     * @param componentTypes - Tipos de componentes por los que filtrar.
     * @returns Array de IDs de entidades que cumplen la query.
     */
    getEntitiesWith(...componentTypes: string[]): Entity[];
    /**
     * Elimina un componente de un tipo específico de una entidad.
     *
     * @param entity - La entidad de la que se elimina el componente.
     * @param type - El tipo de componente a eliminar.
     *
     * @postcondition Incrementa {@link World.version} si el componente fue realmente eliminado.
     * @postcondition Notifica a las queries reactivas para eliminar la entidad de sus resultados.
     */
    removeComponent(entity: Entity, type: string): void;
    /**
     * Consulta las entidades que poseen todos los tipos de componentes especificados.
     * Utiliza queries reactivas para evitar trabajo redundante.
     *
     * @remarks
     * Los resultados de las queries están cacheados internamente. El orden de los tipos de
     * componentes en los argumentos no afecta la identidad de la query.
     * El filtrado optimiza la búsqueda empezando por el componente menos frecuente.
     *
     * @param componentTypes - Uno o más tipos de componentes por los que filtrar.
     * @returns Un array de IDs de {@link Entity} que poseen todos los componentes requeridos.
     *
     * @conceptualRisk [GC_PRESSURE][LOW] La generación frecuente de arrays de resultados puede
     * presionar el recolector de basura si se abusa de queries efímeras en hot paths.
     * @conceptualRisk [MUTABLE_CACHE_LEAK][MEDIUM] {@link Query.getEntities} devuelve una referencia
     * al array interno; no debe ser modificado por el consumidor.
     */
    query(...componentTypes: string[]): Entity[];
    /**
     * Elimina una entidad y todos sus componentes asociados del mundo.
     *
     * @remarks
     * Realiza la limpieza en todos los mapas de componentes, conjuntos de componentes por entidad
     * y notifica a todas las queries activas para eliminar la entidad de sus cachés.
     *
     * @param entity - La entidad a eliminar.
     *
     * @postcondition La entidad se añade a {@link World.freeEntities} para su posterior
     * reutilización e incrementa {@link World.version}.
     * @sideEffect Notifica a todas las {@link Query} registradas.
     */
    removeEntity(entity: Entity): void;
    /**
     * Reinicia el mundo por completo, eliminando todas las entidades, componentes y recursos.
     * Los sistemas permanecen registrados.
     *
     * @postcondition {@link World.version} se incrementa significativamente.
     */
    clear(): void;
    /**
     * Define un recurso global en el mundo.
     *
     * @remarks
     * Los recursos son singletons que no están asociados a entidades específicas,
     * útiles para estados compartidos como configuración o servicios de red.
     *
     * @param name - Clave única del recurso.
     * @param resource - Valor o instancia a almacenar.
     */
    setResource<T>(name: string, resource: T): void;
    /**
     * Recupera un recurso global por su nombre.
     *
     * @param name - Clave del recurso.
     * @returns El valor del recurso o `undefined` si no existe.
     */
    getResource<T>(name: string): T | undefined;
    /**
     * Checks if a resource exists.
     *
     * @param name - Resource key.
     */
    hasResource(name: string): boolean;
    /**
     * Removes a resource from the world.
     *
     * @param name - Resource key.
     */
    removeResource(name: string): void;
    /**
     * Registra un sistema para ser actualizado por el mundo.
     *
     * @param system - La instancia de {@link System} a añadir.
     * @param config - Configuración opcional de fase y prioridad.
     * @see {@link SystemPhase}
     */
    addSystem(system: System, config?: SystemConfig): void;
    /**
     * Ejecuta un ciclo de actualización sobre todos los sistemas registrados.
     *
     * @remarks
     * Los sistemas se ejecutan siguiendo estrictamente el orden de fases y prioridades.
     * Si se ha añadido o eliminado algún sistema desde la última llamada, el motor
     * realiza una re-ordenación automática.
     *
     * @param deltaTime - Tiempo transcurrido desde el último tick en milisegundos.
     *
     * @precondition El mundo debe estar en un estado consistente.
     * @postcondition La versión del mundo puede haber incrementado si los sistemas realizaron
     * cambios estructurales.
     * @sideEffect Invoca el método `update` de cada sistema registrado.
     * @sideEffect Si {@link World.debugMode} es true, actualiza los perfiles de rendimiento.
     */
    update(deltaTime: number): void;
    /**
     * Obtiene el tiempo promedio de ejecución de un sistema en milisegundos.
     *
     * @param system - La instancia del sistema a consultar.
     * @returns Tiempo promedio en ms, o 0 si el profiling no está activo para ese sistema.
     * @remarks Solo disponible si {@link World.debugMode} estaba activo durante el update.
     */
    getSystemTiming(system: System): number;
    /**
     * Obtiene un mapa con los tiempos de ejecución de todos los sistemas registrados.
     *
     * @returns Un objeto donde las llaves son los nombres de clase de los sistemas y los
     * valores son los tiempos promedio en ms.
     */
    getAllSystemTimings(): Record<string, number>;
    private sortSystems;
    /**
     * Returns a list of all active entities currently in the world.
     *
     * @returns An array of all {@link Entity} IDs.
     */
    getAllEntities(): Entity[];
    /**
     * Recupera la lista de todos los tipos de componentes asociados a una entidad.
     *
     * @param entity - El ID de la entidad a consultar.
     * @returns Un array con los nombres de los tipos de componentes.
     */
    getEntityComponentTypes(entity: Entity): string[];
    private notifyQueries;
    private removeEntityFromComponentMaps;
    /**
     * Recupera un componente singleton del mundo.
     * Si el componente está congelado (frozen), lo reemplaza por una copia mutable (Principio 6).
     *
     * @param type - El tipo de componente a recuperar.
     * @returns El componente si se encuentra, de lo contrario `undefined`.
     *
     * @remarks
     * Este método asume que solo una entidad posee el tipo de componente dado.
     * Si varias entidades coinciden, devuelve la primera encontrada por {@link World.query}.
     *
     * @sideEffect Puede mutar el estado del World si necesita reemplazar un componente frozen
     * con una copia mutable para cumplir el Principio 6.
     */
    getSingleton<T extends Component>(type: string): T | undefined;
    private ensureComponentStorage;
}
