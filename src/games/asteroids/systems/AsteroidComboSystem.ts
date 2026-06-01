import { System } from "@tiny-aster/core";
import { World } from "@tiny-aster/core";
import { GameStateComponent } from "../types/AsteroidTypes";
import { EventBus } from "@tiny-aster/core";

export class AsteroidComboSystem extends System {
  private eventBus: EventBus | null = null;

  public update(world: World, _deltaTime: number): void {
    if (!this.eventBus) {
        this.eventBus = world.getResource<EventBus>("EventBus");
        if (this.eventBus) {
            this.eventBus.on("asteroid:bullet_missed", () => this.onBulletMissed(world));
        }
    }

    const gameState = world.getSingleton<GameStateComponent>("GameState");
    if (!gameState) return;

    if (gameState.lastBulletHit) {
      world.mutateSingleton<GameStateComponent>("GameState", (gs) => {
        gs.comboCount++;
        const oldMultiplier = gs.comboMultiplier;
        gs.comboMultiplier = Math.min(Math.floor(gs.comboCount / 3) + 1, 8);
        gs.lastBulletHit = false; // Reset after processing

        if (gs.comboMultiplier !== oldMultiplier) {
          const eventBus = world.getResource<EventBus>("EventBus");
          if (eventBus) eventBus.emitDeferred("asteroid:combo_changed", { multiplier: gs.comboMultiplier });
        }
      });
    }
  }

  public onBulletMissed(world: World): void {
    world.mutateSingleton<GameStateComponent>("GameState", (gs) => {
      gs.comboCount = 0;
      gs.comboMultiplier = 1;
    });
  }
}
