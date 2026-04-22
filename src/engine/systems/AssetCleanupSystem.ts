import { System } from "../core/System";
import { World } from "../core/World";
import { Entity } from "../core/Entity";
import { EventBus } from "../core/EventBus";
import { AssetLoader } from "../assets/AssetLoader";
import { SpriteComponent, AudioComponent } from "../core/CoreComponents";

/**
 * Sistema encargado de la limpieza automática de recursos cuando se destruyen entidades.
 *
 * @responsibility Suscribirse a eventos de destrucción de entidades.
 * @responsibility Identificar componentes que poseen IDs de recursos.
 * @responsibility Liberar los recursos correspondientes en el {@link AssetLoader}.
 */
export class AssetCleanupSystem extends System {
  private assetLoader: AssetLoader;
  private eventBus: EventBus;

  constructor(assetLoader: AssetLoader, eventBus: EventBus) {
    super();
    this.assetLoader = assetLoader;
    this.eventBus = eventBus;

    // Suscripción al evento de destrucción
    this.eventBus.on("entity:destroyed", (payload: { entity: Entity, world: World }) => {
      this.cleanupEntity(payload.world, payload.entity);
    });
  }

  public update(_world: World, _deltaTime: number): void {
    // El sistema reacciona a eventos, no requiere lógica por frame.
  }

  /**
   * Procesa la limpieza de una entidad específica.
   * Debe llamarse con el mundo donde residía la entidad.
   */
  public cleanupEntity(world: World, entity: Entity): void {
    const sprite = world.getComponent<SpriteComponent>(entity, "Sprite");
    if (sprite && sprite.assetId) {
      this.assetLoader.release(sprite.assetId);
    }

    const audio = world.getComponent<AudioComponent>(entity, "Audio");
    if (audio && audio.assetId) {
      this.assetLoader.release(audio.assetId);
    }
  }
}
