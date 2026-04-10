import { System } from "../core/System";
import { World } from "../core/World";
import { RenderComponent, TransformComponent } from "../core/CoreComponents";

/**
 * Sistema que gestiona actualizaciones visuales que no afectan a la simulación física (rotación visual, estelas, flashes).
 *
 * @responsibility Mantener el historial de posiciones para efectos de estela (trails).
 * @responsibility Actualizar la rotación visual basada en la velocidad angular.
 * @responsibility Decrementar los temporizadores de efectos de daño (hit flashes).
 * @queries Transform, Render
 * @mutates Render, World (version)
 * @executionOrder Fase: Presentation.
 *
 * @conceptualRisk [VERSION_BLOAT][LOW] Incrementa `world.version` manualmente en cada frame, lo que
 * fuerza a los renderizadores a redibujar todo incluso si no hay cambios estructurales.
 */
export class RenderUpdateSystem extends System {
  protected trailMaxLength: number;

  constructor(trailMaxLength: number = 10) {
    super();
    this.trailMaxLength = trailMaxLength;
  }

  /**
   * Ejecuta todas las actualizaciones de componentes visuales.
   */
  public update(world: World, deltaTime: number): void {
    this.updateTrails(world);
    this.updateRotation(world, deltaTime);
    this.updateHitFlashes(world);
    world.version++;
  }

  /**
   * Actualiza las estelas (trails) de las entidades.
   * Soporta tanto el componente genérico Render como el componente específico de Ship.
   */
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

  /**
   * Actualiza la rotación visual basándose en la velocidad angular definida en RenderComponent.
   */
  private updateRotation(world: World, deltaTime: number): void {
    const entities = world.query("Render");
    entities.forEach((entity) => {
      const render = world.getComponent<RenderComponent>(entity, "Render");
      if (render && render.angularVelocity) {
        render.rotation += render.angularVelocity * (deltaTime / 16.67);
      }
    });
  }

  /**
   * Gestiona la duración de los efectos de destello cuando una entidad recibe daño.
   */
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
