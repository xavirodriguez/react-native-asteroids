"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComponentCloner = void 0;
/**
 * Utility for deep cloning component data.
 *
 * @internal
 *
 * @remarks
 * This cloner performs a recursive copy of objects and arrays.
 * It is primarily intended for serializable data and has several known limitations:
 * - Circular references: Will cause a stack overflow.
 * - Class instances: Preserves own properties but loses prototype, methods, and private state.
 * - Special types: Does not correctly clone Map, Set, Date, TypedArrays, or other built-in objects.
 * - Functions: Although skipped during world snapshotting, this cloner will return them by reference if encountered.
 *
 * Used during world snapshotting and restoration.
 */
class ComponentCloner {
    /**
     * Performs a deep clone of the provided value.
     *
     * @param component - The value to clone.
     * @returns A deep clone of the value.
     */
    static cloneComponent(component) {
        if (component === null || typeof component !== "object") {
            return component;
        }
        if (Array.isArray(component)) {
            return component.map(v => this.cloneComponent(v));
        }
        const clone = {};
        for (const key in component) {
            if (Object.prototype.hasOwnProperty.call(component, key)) {
                clone[key] = this.cloneComponent(component[key]);
            }
        }
        return clone;
    }
}
exports.ComponentCloner = ComponentCloner;
