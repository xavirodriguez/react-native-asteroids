import { World } from "../../core/World";

/**
 * Clase base abstracta para todas las escenas del juego.
 * Una escena representa un estado específico (e.g., Menú, Jugando, Game Over).
 * Gestiona su propio mundo ECS y proporciona ganchos de ciclo de vida.
 *
 * @responsibility Orquestar la inicialización y limpieza de entidades/sistemas para un estado de juego específico.
 * @responsibility Proveer un contexto aislado (World) para evitar fugas de estado entre escenas.
 */
export abstract class Scene {
  /**
   * El mundo ECS asociado a esta escena.
   */
  protected world: World;

  constructor(world: World) {
    this.world = world;
  }

  /** Nombre identificador de la escena para debugging y transiciones. */
  public name: string = "Unnamed Scene";

  /**
   * Llamado cuando la escena se convierte en la escena activa.
   */
  public onEnter(_world: World): void | Promise<void> {}

  /**
   * Llamado cuando la escena deja de ser la escena activa.
   */
  public onExit(_world: World): void | Promise<void> {}

  /**
   * Llamado cuando el juego se pausa mientras esta escena está activa.
   */
  public onPause(): void {}

  /**
   * Llamado cuando el juego se reanuda mientras esta escena está activa.
   */
  public onResume(): void {}

  /**
   * Llamado durante el tick de actualización de la simulación.
   */
  public onUpdate(dt: number, world: World): void {
    world.update(dt);
  }

  /**
   * Obtiene el mundo ECS de esta escena.
   */
  public getWorld(): World {
    return this.world;
  }
}
