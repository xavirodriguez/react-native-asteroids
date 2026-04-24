import { World } from '../core/World';
import { Entity } from '../core/Entity';

/**
 * @deprecated Mantenido por compatibilidad. Migrar a las nuevas APIs en core o app.
 */
export const Legacy = {
    getEntitiesWith: (world: World, ...types: string[]) => world.query(...types),
    removeEntity: (world: World, entity: Entity) => world.removeEntity(entity),
};
