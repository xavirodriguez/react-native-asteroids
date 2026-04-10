/**
 * Identificador numérico único de una entidad en el sistema ECS.
 *
 * @responsibility Actuar como clave (ID) para el mapeo de componentes.
 *
 * @remarks
 * En un sistema ECS puro, la entidad no es un objeto, sino un identificador numérico (ID).
 * No posee datos ni comportamiento; sirve como clave para buscar componentes.
 * Los IDs son reciclados por el {@link World} o el {@link EntityPool} tras la eliminación de la entidad.
 *
 * @conceptualRisk [ID_REUSE][MEDIUM] Los IDs son reciclados. Sistemas externos que almacenen
 * IDs corren el riesgo de referenciar una entidad distinta tras un ciclo de destrucción/creación.
 */
export type Entity = number;
