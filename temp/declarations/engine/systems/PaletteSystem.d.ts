import { System } from "../core/System";
import { World } from "../core/World";
/**
 * Sistema para aplicar la paleta de colores activa a las entidades según sus etiquetas (tags).
 *
 * @responsibility Sincronizar los colores de los componentes `Render` con la paleta global.
 * @responsibility Reaccionar a cambios en la paleta activa durante la ejecución.
 *
 * @remarks
 * Este sistema permite desacoplar la lógica visual de la lógica de juego, permitiendo
 * mutadores de color o modos daltónicos sin cambiar los prefabs de las entidades.
 *
 * @queries Render, Tag
 * @executionOrder Fase de Presentación (Presentation Phase).
 *
 * @invariant No debe modificar el estado del juego, solo el color en el componente Render.
 * @conceptualRisk [TAG_DEPENDENCY] Si una entidad tiene múltiples tags (ej: LocalPlayer y Enemy),
 * el orden de prioridad actual es fijo y podría causar confusión visual.
 */
export declare class PaletteSystem extends System {
    private activePaletteId;
    constructor(activePaletteId: string);
    update(world: World, deltaTime: number): void;
}
