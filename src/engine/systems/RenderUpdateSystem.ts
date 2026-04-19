import { System } from "../core/System";
import { World } from "../core/World";
import { RenderComponent, TransformComponent, TrailComponent } from "../core/CoreComponents";

/**
 * Sistema de preparación visual y efectos cosméticos.
 *
 * @responsibility Gestionar efectos visuales temporales como estelas (trails) y destellos (flashes).
 * @responsibility Actualizar la rotación cosmética basada en la velocidad angular.
 * @responsibility Sincronizar la versión del mundo para disparar re-renders en la UI.
 * @queries Transform, Render, Trail
 * @mutates Trail.points, Trail.currentIndex, Trail.count, Render.rotation, Render.hitFlashFrames, World.version
 * @executionOrder Fase: Presentation. Ejecutar al final del pipeline de simulación.
 *
 * @remarks
 * Este sistema actúa como un puente entre la simulación física y la presentación visual.
 * Incrementa {@link World.version} para asegurar que los componentes de React/UI se
 * actualicen con el estado más reciente del motor.
 *
 * @conceptualRisk [PERFORMANCE][MEDIUM] El crecimiento de arrays en `trailPositions` genera
 * presión sobre el GC si hay muchas entidades con estela activa.
 * @conceptualRisk [DETERMINISM][LOW] Mutar `Render.rotation` puede causar desincronización
 * si la lógica de colisiones u otra lógica de simulación depende accidentalmente de este valor.
 */
export class RenderUpdateSystem extends System {
  protected trailMaxLength: number;

  constructor(trailMaxLength: number = 10) {
    super();
    this.trailMaxLength = trailMaxLength;
  }

  /**
   * Ejecuta las actualizaciones visuales secundarias.
   *
   * @param world - El mundo ECS.
   * @param deltaTime - Tiempo transcurrido en milisegundos.
   *
   * @precondition El mundo debe estar inicializado y contener entidades con Render.
   * @postcondition Se actualizan estelas, rotaciones cosméticas y contadores de flashes.
   * @sideEffect Incrementa {@link World.version} para disparar re-renderizado.
   */
  public update(world: World, deltaTime: number): void {
    this.updateTrails(world);
    this.updateRotation(world, deltaTime);
    this.updateHitFlashes(world);
    world.version++;
  }

  /**
   * Actualiza el buffer circular de las estelas.
   *
   * @remarks
   * Utiliza una estrategia de buffer circular sobre un array de tamaño fijo
   * para evitar re-asignaciones de memoria y presión de GC.
   */
  protected updateTrails(world: World): void {
    const entities = world.query("Transform", "Trail");
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const pos = world.getComponent<TransformComponent>(entity, "Transform");
      const trail = world.getComponent<TrailComponent>(entity, "Trail");

      if (pos && trail) {
        // Calcular nuevo índice en el buffer circular
        trail.currentIndex = (trail.currentIndex + 1) % trail.maxLength;

        // Reutilizar objeto de posición si es posible o asignar nuevo solo una vez por slot
        if (!trail.points[trail.currentIndex]) {
          trail.points[trail.currentIndex] = { x: pos.x, y: pos.y };
        } else {
          const point = trail.points[trail.currentIndex];
          point.x = pos.x;
          point.y = pos.y;
        }

        // Incrementar contador de puntos válidos hasta el máximo
        if (trail.count < trail.maxLength) {
          trail.count++;
        }
      }
    }
  }

  private updateRotation(world: World, deltaTime: number): void {
    const entities = world.query("Render");
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const render = world.getComponent<RenderComponent>(entity, "Render");

      // Principle: Unified rotation authority is TransformComponent.
      // Cosmetic rotations (like debris) must use VisualOffsetComponent.
      if (render && render.angularVelocity) {
        let offset = world.getComponent<import("../core/CoreComponents").VisualOffsetComponent>(entity, "VisualOffset");
        if (!offset) {
          offset = world.addComponent(entity, {
            type: "VisualOffset", x: 0, y: 0, rotation: 0, scaleX: 0, scaleY: 0
          } as import("../core/CoreComponents").VisualOffsetComponent);
        }
        offset.rotation += render.angularVelocity * (deltaTime / 16.67);
      }
    }
  }

  private updateHitFlashes(world: World): void {
    const entities = world.query("Render");
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const render = world.getComponent<RenderComponent>(entity, "Render");
      if (render && render.hitFlashFrames && render.hitFlashFrames > 0) {
        render.hitFlashFrames--;
      }
    }
  }
}
