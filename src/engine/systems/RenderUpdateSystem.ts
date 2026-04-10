import { System } from "../core/System";
import { World } from "../core/World";
import { RenderComponent, TransformComponent } from "../core/CoreComponents";

/**
 * Sistema encargado de las actualizaciones de estado visual que no afectan la física.
 * Gestiona rotaciones automáticas, acumulación de estelas (trails) y destellos de impacto (hit flashes).
 *
 * @responsibility Mantener el historial de posiciones para efectos de estela.
 * @responsibility Actualizar la rotación visual basada en velocidad angular.
 * @responsibility Gestionar el temporizador de los destellos de impacto.
 * @queries Transform, Render, Ship
 * @mutates Render.trailPositions, Render.rotation, Render.hitFlashFrames, World.version
 * @executionOrder Fase: Presentation.
 *
 * @remarks
 * Incrementa {@link World.version} en cada actualización para forzar el re-renderizado
 * de componentes reactivos en la UI.
 *
 * @conceptualRisk [PERFORMANCE][MEDIUM] La acumulación de estelas para múltiples entidades
 * incrementa el uso de memoria y puede degradar el rendimiento del renderer si `trailMaxLength`
 * es muy elevado.
 * @conceptualRisk [DETERMINISM][LOW] Este sistema muta `Render.rotation`. Si un sistema de
 * colisiones lee la rotación del componente `Render` en lugar del `Transform`, habrá drift.
 */
export class RenderUpdateSystem extends System {
  protected trailMaxLength: number;

  constructor(trailMaxLength: number = 10) {
    super();
    this.trailMaxLength = trailMaxLength;
  }

  public update(world: World, deltaTime: number): void {
    this.updateTrails(world);
    this.updateRotation(world, deltaTime);
    this.updateHitFlashes(world);
    world.version++;
  }

  protected updateTrails(world: World): void {
    const entities = world.query("Transform", "Render");
    entities.forEach((entity) => {
      const pos = world.getComponent<TransformComponent>(entity, "Transform");
      const render = world.getComponent<RenderComponent>(entity, "Render");

      if (pos && render && render.trailPositions) {
        render.trailPositions.push({ x: pos.x, y: pos.y });
        if (render.trailPositions.length > this.trailMaxLength) {
          render.trailPositions.shift();
        }
      }
    });

    // Support game-specific trail components (like Asteroids Ship)
    const shipEntities = world.query("Transform", "Ship");
    shipEntities.forEach((entity) => {
        const pos = world.getComponent<TransformComponent>(entity, "Transform");
        const ship = world.getComponent<any>(entity, "Ship");

        if (pos && ship && ship.trailPositions) {
            ship.trailPositions.push({ x: pos.x, y: pos.y });
            if (ship.trailPositions.length > this.trailMaxLength) {
                ship.trailPositions.shift();
            }
        }
    });
  }

  private updateRotation(world: World, deltaTime: number): void {
    const entities = world.query("Render");
    entities.forEach((entity) => {
      const render = world.getComponent<RenderComponent>(entity, "Render");
      if (render && render.angularVelocity) {
        render.rotation += render.angularVelocity * (deltaTime / 16.67);
      }
    });
  }

  private updateHitFlashes(world: World): void {
    const entities = world.query("Render");
    entities.forEach((entity) => {
      const render = world.getComponent<RenderComponent>(entity, "Render");
      if (render && render.hitFlashFrames && render.hitFlashFrames > 0) {
        render.hitFlashFrames--;
      }
    });
  }
}
