import { World } from "../core/World";

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
   * @invariant Cada escena posee una instancia única de World a menos que se comparta explícitamente.
   */
  protected world: World;

  constructor(world: World) {
    this.world = world;
  }

  /** Nombre identificador de la escena para debugging y transiciones. */
  public name: string = "Unnamed Scene";

  /**
   * Llamado cuando la escena se convierte en la escena activa.
   * @param _world - Referencia al mundo de la escena.
   * @contract Debe inicializar los sistemas y entidades necesarios.
   * @conceptualRisk [ASYNC_INIT] Si es asíncrono, la lógica de actualización debe esperar a que se resuelva
   * para evitar referencias nulas o sistemas incompletos.
   */
  public onEnter(_world: World): void | Promise<void> {}

  /**
   * Llamado cuando la escena deja de ser la escena activa.
   * @param _world - Referencia al mundo de la escena.
   * @contract Debe liberar recursos pesados o cancelar suscripciones pendientes.
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
   * @param dt - Tiempo transcurrido en segundos.
   * @param world - El mundo a actualizar.
   * @executionOrder Típicamente llamado por el {@link SceneManager} dentro del GameLoop.
   */
  public onUpdate(dt: number, world: World): void {
    world.update(dt);
  }

  /**
   * Llamado durante el paso de renderizado.
   * @param _alpha - Factor de interpolación para renderizado suave.
   */
  public onRender(_alpha: number): void {}

  /**
   * Obtiene el mundo ECS de esta escena.
   * @queries world
   */
  public getWorld(): World {
    return this.world;
  }

  /**
   * Métodos de reenvío públicos para compatibilidad con versiones anteriores.
   * @deprecated Usar el flujo de SceneManager u onUpdate directamente.
   */
  public update(dt: number): void {
    this.onUpdate(dt, this.world);
  }

  /**
   * @deprecated Delegar renderizado al RenderSystem o SceneManager.
   */
  public render(renderer: import("../rendering/Renderer").Renderer): void {
    renderer.render(this.world);
  }
}
