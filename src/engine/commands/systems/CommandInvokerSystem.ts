import { World } from "../../core/World";
import { System } from "../../core/System";
import { TransformComponent, VelocityComponent } from "../../core/CoreComponents";
import { CommandQueueComponent, GameCommand } from "../types";

/**
 * CommandInvokerSystem: Responsable de la Capa de Ejecución.
 * Consume los comandos serializables de la cola y aplica las mutaciones
 * físicas y lógicas correspondientes en el mundo ECS.
 */
export class CommandInvokerSystem extends System {
  // Constantes de calibración (Deberían provenir de un GameConfig en el futuro)
  private static readonly ROTATION_SPEED = 4.5; // [rad/s]
  private static readonly THRUST_ACCEL = 200;    // [px/s^2]

  /**
   * Procesa secuencialmente los comandos de las colas de cada entidad.
   *
   * @param world - Instancia del mundo ECS.
   * @param deltaTime - Tiempo transcurrido en milisegundos.
   */
  public update(world: World, deltaTime: number): void {
    const entities = world.query("CommandQueue");
    const dtSeconds = deltaTime * 0.001; // Conversión a segundos para determinismo físico

    for (const entity of entities) {
      const queue = world.getComponent<CommandQueueComponent>(entity, "CommandQueue");

      if (!queue || queue.pending.length === 0) continue;

      // Despacho secuencial de comandos (Importante para el orden de las operaciones)
      for (const command of queue.pending) {
        this.executeCommand(world, entity, command, dtSeconds);
      }

      // REGLA: Limpiar la cola tras el procesamiento para evitar doble ejecución
      world.mutateComponent<CommandQueueComponent>(entity, "CommandQueue", (q) => {
        q.pending = [];
      });
    }
  }

  /**
   * Despachador interno que mapea tipos de comandos a lógica de mutación segura.
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
        // Emitir evento de disparo para ser procesado por sistemas de armas o efectos
        world.emitSimulationEvent("ship:shoot", { entityId: entity });
        break;
    }
  }

  /**
   * Aplica aceleración en la dirección actual del Transform.
   */
  private handleThrust(world: World, entity: number, dt: number): void {
    const transform = world.getComponent<TransformComponent>(entity, "Transform");
    if (!transform) return;

    // Cálculo vectorial determinista
    const rotation = transform.rotation;
    const forceX = Math.cos(rotation) * CommandInvokerSystem.THRUST_ACCEL * dt;
    const forceY = Math.sin(rotation) * CommandInvokerSystem.THRUST_ACCEL * dt;

    // Mutación autoritativa del componente Velocity
    world.mutateComponent<VelocityComponent>(entity, "Velocity", (vel) => {
      vel.dx += forceX;
      vel.dy += forceY;
    });
  }

  /**
   * Modifica la rotación del transform integrando el tiempo.
   */
  private handleRotation(world: World, entity: number, direction: number, dt: number): void {
    world.mutateComponent<TransformComponent>(entity, "Transform", (trans) => {
      trans.rotation += direction * CommandInvokerSystem.ROTATION_SPEED * dt;
      trans.dirty = true; // Notificar al HierarchySystem que el transform local cambió
    });
  }

  /**
   * Teletransporta la entidad a una posición aleatoria determinista.
   */
  private handleHyperspace(world: World, entity: number): void {
    // Usamos el servicio de PRNG del motor para garantizar determinismo en rollback/netcode
    const rng = world.gameplayRandom;

    // Límites asumiendo resolución estándar (Mejorable inyectando GameConfig)
    const newX = rng.nextRange(50, 750);
    const newY = rng.nextRange(50, 550);

    world.mutateComponent<TransformComponent>(entity, "Transform", (trans) => {
      trans.x = newX;
      trans.y = newY;
      trans.dirty = true;
    });
  }
}
