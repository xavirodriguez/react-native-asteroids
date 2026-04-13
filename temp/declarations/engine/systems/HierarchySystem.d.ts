import { System } from "../core/System";
import { World } from "../core/World";
/**
 * Sistema responsable de resolver las transformaciones espaciales jerárquicas.
 *
 * @responsibility Calcular coordenadas de mundo (worldX, worldY, worldRotation, worldScale)
 * a partir de coordenadas locales y la relación con el padre.
 * @responsibility Propagar cambios de transformación mediante un sistema de flags 'dirty'
 * para optimizar el rendimiento.
 * @queries Transform
 * @mutates Transform (worldX, worldY, worldRotation, worldScaleX, worldScaleY, dirty)
 * @executionOrder Fase: Simulation/Presentation. Debe ejecutarse tras los sistemas que mutan
 * la posición local y antes del renderizado.
 *
 * @remarks
 * Implementa una propagación top-down para asegurar que los hijos siempre se calculen
 * después de sus padres. Utiliza matrices 3x3 para composición de transformaciones.
 *
 * @conceptualRisk [LAYOUT_CASCADE][MEDIUM] Una jerarquía muy profunda puede causar un
 * coste de cálculo elevado si la raíz cambia frecuentemente.
 * @conceptualRisk [WORLD_SYNC][HIGH] Si un sistema lee `worldX/Y` antes de que `HierarchySystem`
 * se ejecute en el frame actual, obtendrá datos del frame anterior (lag visual o de física).
 */
export declare class HierarchySystem extends System {
    private wasDirty;
    /**
     * Resuelve recursivamente las transformaciones de mundo para todas las entidades.
     *
     * @param world - El mundo ECS.
     * @param _deltaTime - Tiempo transcurrido (ignorado).
     *
     * @precondition El orden de ejecución debe ser posterior a los sistemas que mutan
     * la posición local.
     * @postcondition Todas las entidades con `Transform` tienen sus coordenadas `world*`
     * actualizadas si ellas o sus padres estaban marcados como `dirty`.
     * @sideEffect Resetea el flag `dirty` de los componentes `Transform`.
     */
    update(world: World, _deltaTime: number): void;
    /**
     * Actualiza recursivamente la transformación de una entidad.
     */
    private updateTransform;
    private setToLocal;
    private getMatrixFromTransform;
    private multiplyMat3;
    private applyMatrixToWorldTransform;
}
