import { World } from "../core/World";
import {
  PositionComponent,
  RenderComponent,
  GameStateComponent,
  ScreenShake,
  Entity,
} from "../../types/GameTypes";

export interface RenderableEntity {
  id: Entity;
  pos: { x: number; y: number };
  render: RenderComponent;
}

export interface RenderFrame {
  entities: RenderableEntity[];
  screenShake: ScreenShake | null;
  stars: any[] | null;
  version: number;
}

/**
 * Decouples the React rendering layer from the ECS World.
 * Extracts a serializable snapshot of the world for the renderer.
 * Completely agnostic to game-specific logic or entities.
 */
export class RenderBridge {
  public extractFrame(world: World): RenderFrame {
    const renderableIds = world.query("Position", "Render");

    const gameStateEntity = world.query("GameState")[0];
    const gameState = gameStateEntity
      ? world.getComponent<GameStateComponent>(gameStateEntity, "GameState")
      : null;

    const entities: RenderableEntity[] = renderableIds.map(id => {
      const pos = world.getComponent<PositionComponent>(id, "Position")!;
      const render = world.getComponent<RenderComponent>(id, "Render")!;

      return {
        id,
        pos: { x: pos.x, y: pos.y },
        render: { ...render }, // Shallow copy to ensure serializability
      };
    });

    return {
      entities,
      screenShake: gameState?.screenShake || null,
      stars: gameState?.stars || null,
      version: world.version,
    };
  }
}
