"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Query = void 0;
/**
 * A Query provides a filtered view of entities that possess a specific set of components.
 *
 * @remarks
 * Queries are automatically updated by the {@link World} when components are added or removed.
 * They maintain an internally sorted list of entities to support a stable iteration order based on entity IDs.
 *
 * Performance: Queries are designed for efficiency as they cache their results and only update when
 * structural changes occur in the world.
 *
 * @typeParam TComponents - The component registry this query operates on.
 */
class Query {
    componentTypes;
    entities = new Set();
    sortedEntities = [];
    isDirty = false;
    /**
     * @internal
     * @param componentTypes - The list of component types required by this query.
     */
    constructor(componentTypes) {
        this.componentTypes = componentTypes;
    }
    /**
     * Checks if a set of component types matches the query's requirements.
     */
    matches(componentSet) {
        return this.componentTypes.every(type => componentSet.has(type));
    }
    add(entity) {
        if (!this.entities.has(entity)) {
            this.entities.add(entity);
            this.isDirty = true;
        }
    }
    remove(entity) {
        if (this.entities.delete(entity)) {
            this.isDirty = true;
        }
    }
    /**
     * Returns a list of entities that match the query, sorted by ID.
     *
     * @remarks
     * Sorting happens lazily and only when the query is "dirty" (after entities are added or
     * removed).
     *
     * @warning
     * **Stable Iteration Order**: The list is sorted by entity ID to support stable
     * iteration across frames. This stability relies on entity IDs being
     * created and recycled consistently within the {@link World}.
     *
     * **Performance & Memory**: The first access after a structural change (add/remove)
     * incurs an O(N log N) sorting cost and creates a new array. Frequent structural
     * changes combined with query access in hot paths is expected to increase GC pressure.
     */
    getEntities() {
        if (this.isDirty) {
            this.sortedEntities = Array.from(this.entities).sort((a, b) => a - b);
            this.isDirty = false;
        }
        return this.sortedEntities;
    }
    rebuild(activeEntities, entityComponentSets) {
        this.entities.clear();
        activeEntities.forEach(entity => {
            const set = entityComponentSets.get(entity);
            if (set && this.matches(set)) {
                this.entities.add(entity);
            }
        });
        this.isDirty = true;
    }
}
exports.Query = Query;
