import { System } from "../core/System";
import { World } from "../core/World";
import { Component, RenderComponent, TransformComponent } from "../core/CoreComponents";

/**
 * Sistema de preparación visual y efectos cosméticos.
 *
 * @responsibility Gestionar efectos visuales temporales como estelas (trails) y destellos (flashes).
 * @responsibility Actualizar la rotación cosmética basada en la velocidad angular.
 * @responsibility Sincronizar la versión del mundo para disparar re-renders en la UI.
 * @queries Transform, Render, Ship
 * @mutates Render.trailPositions, Render.rotation, Render.hitFlashFrames, World.version
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
        const ship = world.getComponent<Component & Record<string, unknown>>(entity, "Ship");

        if (pos && ship && Array.isArray(ship.trailPositions)) {
            const trails = ship.trailPositions as {x: number, y: number}[];
            trails.push({ x: pos.x, y: pos.y });
            if (trails.length > this.trailMaxLength) {
                trails.shift();
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
