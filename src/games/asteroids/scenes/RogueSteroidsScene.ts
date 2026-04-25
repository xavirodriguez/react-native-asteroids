import { World } from "../../../engine/core/World";
import { AsteroidsGameScene } from "./AsteroidsGameScene";
import { GameStateComponent } from "../types/AsteroidTypes";

/**
 * Experimental scene implementing "Rogue-Steroids" mechanics.
 */
export class RogueSteroidsScene extends AsteroidsGameScene {
  private waveCount = 0;

  public override onUpdate(deltaTime: number, world: World): void {
    super.onUpdate(deltaTime, world);

    const gameState = world.getSingleton<GameStateComponent>("GameState");
    if (gameState && gameState.asteroidsRemaining === 0) {
      this.waveCount++;
      this.presentUpgradeChoice();
    }
  }

  private presentUpgradeChoice(): void {
    console.log("Wave Complete! Choose an upgrade: Triple Shot or Contact Shield");
    // Implementation would involve a UI overlay to let the player pick a mutator
  }
}
