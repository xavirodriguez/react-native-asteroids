jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("expo-audio", () => ({ createAudioPlayer: jest.fn(), setAudioModeAsync: jest.fn() }));
jest.mock("expo-asset", () => ({ Asset: { fromModule: jest.fn() } }));
jest.mock("../AudioSystem");
jest.mock("../../../services/PlayerProfileService", () => ({
  PlayerProfileService: {
    getProfile: jest.fn().mockResolvedValue({
      activePalette: "default",
      xp: 0,
      level: 1
    })
  }
}));

import { BaseGame, GameStatus } from "../BaseGame";
import { World } from "../World";
import { Renderer } from "../../rendering/Renderer";
import { GameStateComponent, INITIAL_GAME_STATE } from "../../../games/asteroids/types/AsteroidTypes";
import { System } from "../System";

// Implementación mínima para tests
class TestGame extends BaseGame<GameStateComponent, Record<string, boolean>> {
  public initializeRenderer(_renderer: Renderer<unknown>): void {}
  protected registerSystems(): void {
    this.world.addSystem({
      update: () => {},
      dispose: () => {},
      onRegister: () => {},
      onUnregister: () => {}
    } as unknown as System);
  }
  protected initializeEntities(): void {
    this.world.createEntity();
  }
  public getGameState(): GameStateComponent { return INITIAL_GAME_STATE; }
  public isGameOver(): boolean { return false; }

  // Sobrescribir para evitar dependencias de AsyncStorage en tests unitarios del core
  protected async registerEssentialSystems(_world: World): Promise<void> {
    // No-op para tests
  }
}

describe("BaseGame Lifecycle - Destroy", () => {
  it("should clear all resources on destroy", async () => {
    const game = new TestGame();
    await game.init();

    expect(game.getWorld().entities.length).toBeGreaterThan(0);
    expect((game.getWorld() as unknown as { systemsList: unknown[] }).systemsList.length).toBeGreaterThan(0);

    game.destroy();

    expect(game.getStatus()).toBe(GameStatus.DESTROYED);
    expect(game.getWorld().entities.length).toBe(0);
    expect((game.getWorld() as unknown as { systemsList: unknown[] }).systemsList.length).toBe(0);
    // @ts-expect-error - Accessing internal EventBus handlers for verification
    expect(game.eventBus.handlers.size).toBe(0);
  });

  it("should be idempotent", () => {
    const game = new TestGame();
    game.destroy();
    expect(() => game.destroy()).not.toThrow();
  });
});
