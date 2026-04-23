import { System } from "../core/System";
import { World } from "../core/World";
import { Entity } from "../core/Entity";
import { EventBus } from "../core/EventBus";
import { AssetLoader } from "../assets/AssetLoader";
import { SpriteComponent, AudioComponent } from "../core/CoreComponents";

/**
 * AssetCleanupSystem - Libera automáticamente los activos cuando se destruyen las entidades.
 *
 * @responsibility Escuchar eventos de destrucción de entidades.
 * @responsibility Identificar componentes que poseen IDs de activos.
 * @responsibility Llamar a assetLoader.release() para evitar fugas de memoria.
 */
export class AssetCleanupSystem extends System {
  constructor(private eventBus: EventBus) {
    super();
    this.eventBus.on("entity:destroyed", (payload: { entity: Entity; world: World }) => {
      this.cleanupEntityAssets(payload.entity, payload.world);
    });
  }

  /**
   * Este sistema es puramente reactivo y no requiere lógica en su ciclo de update.
   */
  update(_world: World, _deltaTime: number): void {}

  private cleanupEntityAssets(entity: Entity, world: World): void {
    const assetLoader = world.getResource<AssetLoader>("AssetLoader");
    if (!assetLoader) return;

    // Verificar SpriteComponent
    const sprite = world.getComponent<SpriteComponent>(entity, "Sprite");
    if (sprite && sprite.assetId) {
      assetLoader.release(sprite.assetId);
    }

    // Verificar AudioComponent
    const audio = world.getComponent<AudioComponent>(entity, "Audio");
    if (audio && audio.assetId) {
      assetLoader.release(audio.assetId);
    }
  }
}
