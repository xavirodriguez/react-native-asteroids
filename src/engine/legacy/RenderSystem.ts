import { World } from "../core/World";
import { Renderer, RenderCommand } from "./RenderTypes";
import { RenderableComponent, Transform } from "./LegacyComponents";
import { SceneGraph } from "./SceneGraph";


/**
 * Sistema puente entre el mundo ECS y los backends de renderizado.
 *
 * @remarks
 * RenderSystem es responsable de traducir los componentes `Renderable` en comandos de dibujo
 * genéricos que cualquier implementación de `Renderer` (Canvas, Skia, SVG) pueda procesar.
 * Gestiona el orden de dibujado (Z-order) y la visibilidad.
 *
 * @responsibility Consultar entidades renderizables y generar la lista de comandos.
 * @responsibility Aplicar transformaciones de mundo obtenidas del `TransformComponent`.
 * @responsibility Orquestar el ciclo de vida del frame en el renderer (begin/submit/end).
 *
 * @queries Renderable, Transform
 * @mutates Renderer (indirecto vía comandos), CommandPool
 * @dependsOn Renderer, World
 * @executionOrder Fase: Presentation. Ejecutar después de la simulación y antes del fin del frame.
 *
 * @conceptualRisk [Z_ORDER_STABILITY][LOW] El algoritmo de ordenación utilizado (Array.sort)
 * puede no ser estable en todos los motores JS, lo que podría causar parpadeo visual
 * si dos entidades comparten el mismo `zIndex`.
 */
export class RenderSystem {
  private commandPool: RenderCommand[] = [];
  private activeCommands: RenderCommand[] = [];
  private poolIndex = 0;

  constructor(private renderer: Renderer) {}

  /**
   * Genera y despacha comandos de renderizado para el frame actual.
   *
   * @remarks
   * Utiliza un pool interno de comandos para evitar asignaciones de memoria en cada frame.
   *
   * @param world - El mundo ECS de donde extraer los componentes `Renderable`.
   * @param alpha - Factor de interpolación para la suavización visual.
   *
   * @precondition El `HierarchySystem` debe haber resuelto las transformaciones de mundo antes de esta llamada.
   * @postcondition El `renderer` asociado recibe una secuencia ordenada de comandos.
   * @sideEffect Llama a `renderer.beginFrame`, `renderer.submit` y `renderer.endFrame`.
   */
  public update(world: World, alpha: number): void {
    const renderables = world.getEntitiesWith("Renderable", "Transform");
    this.poolIndex = 0;
    this.activeCommands.length = 0;

    for (const entityId of renderables) {
      const renderable = world.getComponent<RenderableComponent>(entityId, "Renderable")!;
      if (!renderable.visible) continue;

      const transform = world.getComponent<TransformComponent>(entityId, "Transform")!;

      const cmd = this.acquireCommand();
      cmd.type = renderable.shape;
      cmd.entityId = entityId;

      // Zero-allocation: Update properties individually
      this.copyWorldTransform(cmd.worldTransform, transform);

      cmd.alpha = alpha;
      cmd.textureId = renderable.textureId || undefined;
      cmd.width = renderable.width;
      cmd.height = renderable.height;
      cmd.color = renderable.color;
      cmd.zIndex = renderable.zOrder;
      cmd.visible = renderable.visible;

      this.activeCommands.push(cmd);
    }

    // Sort by zIndex
    this.activeCommands.sort((a, b) => a.zIndex - b.zIndex);

    // Submit to renderer
    this.renderer.beginFrame(alpha);
    for (const cmd of this.activeCommands) {
      this.renderer.submit(cmd);
    }
    this.renderer.endFrame();
  }

  private copyWorldTransform(to: Transform, from: TransformComponent): void {
    to.x = from.worldX ?? from.x;
    to.y = from.worldY ?? from.y;
    to.rotation = from.worldRotation ?? from.rotation;
    to.scaleX = from.worldScaleX ?? from.scaleX;
    to.scaleY = from.worldScaleY ?? from.scaleY;
  }

  private acquireCommand(): RenderCommand {
    if (this.poolIndex >= this.commandPool.length) {
      this.commandPool.push({
        type: 'rect',
        entityId: 0,
        worldTransform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        alpha: 0,
        zIndex: 0,
        visible: true
      });
    }
    return this.commandPool[this.poolIndex++];
  }
}
