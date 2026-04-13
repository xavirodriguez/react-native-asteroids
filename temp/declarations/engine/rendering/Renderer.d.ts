import { World } from "../core/World";
import { Entity, Component, TransformComponent, RenderComponent } from "../types/EngineTypes";
/**
 * Interfaz para la lógica de dibujo de formas personalizadas.
 *
 * @remarks
 * Los juegos pueden registrar sus propios dibujadores para extender las capacidades visuales
 * sin modificar el motor core.
 */
export type ShapeDrawer<TContext> = (ctx: TContext, entity: Entity, pos: TransformComponent, render: RenderComponent, world: World) => void;
/**
 * Interfaz para efectos personalizados de fondo (background) o primer plano (foreground).
 *
 * @remarks
 * Útil para efectos globales como starfields, post-procesado CRT o partículas de ambiente.
 */
export type EffectDrawer<TContext> = (ctx: TContext, world: World, width: number, height: number) => void;
/**
 * Interfaz abstracta para los renderizadores de juego.
 * Define el contrato que debe cumplir cualquier backend de renderizado (Canvas, Skia, SVG).
 *
 * @responsibility Actuar como el puente visual entre el estado del {@link World} y la pantalla.
 * @responsibility Ordenar el dibujo de entidades por profundidad (zIndex).
 * @responsibility Proporcionar hooks de extensión para efectos y formas personalizadas.
 *
 * @remarks
 * El diseño permite cambiar el backend de renderizado de forma transparente para la lógica ECS.
 * Los renderizadores son generalmente pasivos y reactivos a los cambios en {@link World.version}.
 */
export interface Renderer {
    /** Identificador único del tipo de renderizador (e.g., 'canvas', 'skia'). */
    readonly type: string;
    /**
     * Limpia la superficie de dibujo.
     * Normalmente rellena el fondo con un color sólido o lo deja transparente.
     */
    clear(): void;
    /**
     * Renderiza el estado actual del mundo ECS completo.
     *
     * @remarks
     * Implementa el pipeline principal de renderizado:
     * 1. Limpieza (clear)
     * 2. Efectos de fondo (backgroundEffects)
     * 3. Ordenación (sorting por zIndex)
     * 4. Dibujo de entidades (drawEntity)
     * 5. Partículas (drawParticles)
     * 6. Efectos de primer plano (foregroundEffects)
     *
     * @param world - El mundo ECS a renderizar.
     */
    render(world: World): void;
    /**
     * Dibuja una única entidad utilizando sus componentes.
     *
     * @param entity - El ID de la entidad.
     * @param components - Mapa de tipos de componentes a instancias para la entidad.
     * @param world - El mundo ECS para contexto adicional.
     */
    drawEntity(entity: Entity, components: Record<string, Component>, world: World): void;
    /**
     * Dibuja partículas de forma separada u optimizada.
     */
    drawParticles(world: World): void;
    /**
     * Establece las dimensiones del área de visualización.
     *
     * @param width - Ancho en píxeles lógicos.
     * @param height - Alto en píxeles lógicos.
     */
    setSize(width: number, height: number): void;
    /**
     * Registra un dibujador de formas personalizado para usar con el componente Render.
     *
     * @param name - Identificador de la forma (e.g., "star", "ship").
     * @param drawer - Implementación de la lógica de dibujo específica del backend.
     */
    registerShape(name: string, drawer: ShapeDrawer<any>): void;
    /**
     * Registra un efecto de fondo global.
     */
    registerBackgroundEffect(name: string, drawer: EffectDrawer<any>): void;
    /**
     * Registra un efecto de primer plano global (UI, filtros).
     */
    registerForegroundEffect(name: string, drawer: EffectDrawer<any>): void;
}
