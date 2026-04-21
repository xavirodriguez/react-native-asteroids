/**
 * Identificador único para una entidad en el mundo ECS.
 *
 * @remarks
 * En esta implementación, una Entidad es un ID numérico ligero (entero).
 * No posee datos ni comportamiento propios; sirve exclusivamente como clave
 * para indexar componentes en el {@link World}.
 *
 * Los IDs son gestionados por un {@link EntityPool} que permite la reutilización
 * de identificadores de entidades destruidas para minimizar la fragmentación.
 *
 * @conceptualRisk [ID_REUSE_STALE_REFS][HIGH] Si un sistema externo mantiene una referencia
 * a un ID de Entidad después de que esta ha sido destruida, podría acceder inadvertidamente
 * a una nueva entidad que haya reutilizado el mismo ID.
 */
export type Entity = number;
