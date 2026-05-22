import { World } from "../../core/World";
import { System } from "../../core/System";
import { TransformComponent, VelocityComponent } from "../../core/CoreComponents";
import { CommandQueueComponent, GameCommand } from "../types";
import { RandomService } from "../../utils/RandomService";

/**
 * Sistema que consume y ejecuta comandos de las colas de las entidades.
 * Implementa la lógica de mutación determinista para cada tipo de comando.
 */
export class CommandInvokerSystem extends System {
  private static readonly ROTATION_SPEED = 4.5; // rad/s
  private static readonly THRUST_ACCEL = 200;    // px/s^2

  /**
   * Procesa secuencialmente los comandos pendientes de cada entidad.
   */
  public update(world: World, deltaTime: number): void {
    const entities = world.query("CommandQueue");
    const dtSeconds = deltaTime * 0.001;

    for (const entity of entities) {
      const queue = world.getComponent<CommandQueueComponent>(entity, "CommandQueue");
      if (!queue || queue.pending.length === 0) continue;

      // Procesar cada comando en la cola
      for (const command of queue.pending) {
        this.executeCommand(world, entity, command, dtSeconds);
      }

      // Limpiar la cola tras el procesamiento exitoso
      world.mutateComponent<CommandQueueComponent>(entity, "CommandQueue", (q) => {
        q.pending = [];
      });
    }
  }

  /**
   * Despachador de comandos que aplica las mutaciones ECS correspondientes.
   */
  private executeCommand(world: World, entity: number, command: GameCommand, dt: number): void {
    switch (command.type) {
      case 'THRUST':
        this.handleThrust(world, entity, dt);
        break;
      case 'ROTATE_LEFT':
        this.handleRotation(world, entity, -1, dt);
        break;
      case 'ROTATE_RIGHT':
        this.handleRotation(world, entity, 1, dt);
        break;
      case 'HYPERSPACE':
        this.handleHyperspace(world, entity);
        break;
      case 'FIRE':
        // La lógica de disparo suele requerir creación de entidades,
        // lo cual debe hacerse mediante el CommandBuffer o sistemas especializados.
        // Por ahora lo dejamos como extensión futura o evento.
        break;
    }
  }

  private handleThrust(world: World, entity: number, dt: number): void {
    const transform = world.getComponent<TransformComponent>(entity, "Transform");
    if (!transform) return;

    const rotation = transform.rotation;
    const forceX = Math.cos(rotation) * CommandInvokerSystem.THRUST_ACCEL * dt;
    const forceY = Math.sin(rotation) * CommandInvokerSystem.THRUST_ACCEL * dt;

    world.mutateComponent<VelocityComponent>(entity, "Velocity", (vel) => {
      vel.dx += forceX;
      vel.dy += forceY;
    });
  }

  private handleRotation(world: World, entity: number, direction: number, dt: number): void {
    world.mutateComponent<TransformComponent>(entity, "Transform", (trans) => {
      trans.rotation += direction * CommandInvokerSystem.ROTATION_SPEED * dt;
      trans.dirty = true;
    });
  }

  private handleHyperspace(world: World, entity: number): void {
    const rng = RandomService.getGameplayRandom();
    const newX = rng.nextRange(0, 800);
    const newY = rng.nextRange(0, 600);

    world.mutateComponent<TransformComponent>(entity, "Transform", (trans) => {
      trans.x = newX;
      trans.y = newY;
      trans.dirty = true;
    });
  }
}
