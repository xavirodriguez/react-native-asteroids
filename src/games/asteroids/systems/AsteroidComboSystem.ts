import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { GameStateComponent } from "../types/AsteroidTypes";
import { EventBus } from "../../../engine/core/EventBus";

export class AsteroidComboSystem extends System {
  private eventBus: EventBus | null = null;

  public update(world: World, deltaTime: number): void {
    if (!this.eventBus) {
        this.eventBus = world.getResource<EventBus>("EventBus");
        if (this.eventBus) {
            this.eventBus.on("asteroid:bullet_missed", () => this.onBulletMissed(world));
        }
    }

    const gameState = world.getSingleton<GameStateComponent>("GameState");
    if (!gameState) return;

    if (gameState.lastBulletHit) {
      gameState.comboCount++;
      const oldMultiplier = gameState.comboMultiplier;
      gameState.comboMultiplier = Math.min(Math.floor(gameState.comboCount / 3) + 1, 8);
      gameState.lastBulletHit = false; // Reset after processing

      if (gameState.comboMultiplier !== oldMultiplier) {
        const eventBus = world.getResource<EventBus>("EventBus");
        if (eventBus) eventBus.emit("asteroid:combo_changed", { multiplier: gameState.comboMultiplier });
      }
    }
  }

  public onBulletMissed(world: World): void {
    const gameState = world.getSingleton<GameStateComponent>("GameState");
    if (gameState) {
      gameState.comboCount = 0;
      gameState.comboMultiplier = 1;
    }
  }
}
