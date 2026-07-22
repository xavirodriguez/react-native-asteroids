import { World } from "../../../ecs/World";
import { BaseGameStateSystem } from "../../../systems/BaseGameStateSystem";
import { GameStateComponent } from "../types/AsteroidTypes";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../types/AsteroidRegistry";
import { IAsteroidsGame } from "../types/GameInterfaces";
import { createShip, createAsteroid } from "../EntityFactory";

/** @public */
export class AsteroidGameStateSystem extends BaseGameStateSystem<
  GameStateComponent,
  AsteroidsComponentRegistry,
  AsteroidsEventRegistry
> {
  private game: IAsteroidsGame;
  private respawnTimer = 0;

  constructor(game: IAsteroidsGame) {
    super("GameState");
    this.game = game;
  }

  protected getGameState(world: World<AsteroidsComponentRegistry>): GameStateComponent | undefined {
    return world.getSingleton("GameState");
  }

  protected updateGameState(world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, gameState: GameStateComponent, deltaTime: number): void {
    if (gameState.isGameOver) return;

    const screenConfig = world.getResource<any>("ScreenConfig") || { width: 800, height: 600 };
    const width = screenConfig.width ?? 800;
    const height = screenConfig.height ?? 600;
    const config = world.getResource<any>("GameConfig") || { INITIAL_ASTEROID_COUNT: 5 };

    // 1. Ship Respawn logic
    const shipQuery = world.query("LocalPlayer");
    if (shipQuery.length === 0) {
      if (gameState.lives > 0) {
        this.respawnTimer += deltaTime;
        if (this.respawnTimer >= 1.0) { // 1 second delay before respawning
          this.respawnTimer = 0;
          gameState.lives--;

          if (gameState.lives > 0) {
            const ship = createShip({ world, x: width / 2, y: height / 2 });
            world.addComponent(ship, { type: "LocalPlayer" } as any);
            world.addComponent(ship, { type: "Ship", sessionId: "local" } as any);
            world.addComponent(ship, { type: "Invulnerable" } as any);
            world.addComponent(ship, { type: "TTL", timeLeft: 3.0, remaining: 3.0 } as any);
          }
        }
      }
    } else {
      this.respawnTimer = 0;
    }

    // 2. Wave / Level management logic
    const asteroidQuery = world.query("Asteroid");
    if (asteroidQuery.length === 0) {
      gameState.level++;

      const count = (config.INITIAL_ASTEROID_COUNT ?? 5) + gameState.level - 1;
      for (let i = 0; i < count; i++) {
        let ax = world.gameplayRandom.next() * width;
        let ay = world.gameplayRandom.next() * height;
        while (Math.hypot(ax - width / 2, ay - height / 2) < 150) {
          ax = world.gameplayRandom.next() * width;
          ay = world.gameplayRandom.next() * height;
        }
        createAsteroid({ world, x: ax, y: ay, size: "large" });
      }
    }
  }

  protected evaluateGameOverCondition(gameState: GameStateComponent): boolean {
    return gameState.lives <= 0;
  }

  public update(world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, deltaTime: number): void {
      super.update(world, deltaTime);
  }

  public isGameOver(): boolean {
      const state = this.game.getGameState();
      return state.isGameOver;
  }

  public resetGameOverState(world: World<AsteroidsComponentRegistry>): void {
      world.mutateSingleton("GameState", (state) => {
          state.isGameOver = false;
          state.lives = 3;
          state.score = 0;
          state.level = 1;
      });
  }
}
