import { BaseGame, GameStatus } from "../BaseGame";
import { World } from "../World";
import { Renderer } from "../../rendering/Renderer";

// Implementación mínima para tests
class TestGame extends BaseGame<any, any> {
  public initializeRenderer(_renderer: Renderer<unknown>): void {}
  protected registerSystems(): void {
    this.world.addSystem({ update: () => {}, dispose: () => {} });
  }
  protected initializeEntities(): void {
    this.world.createEntity();
  }
  public getGameState(): any { return {}; }
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
    expect((game as any).world.systemsList.length).toBeGreaterThan(0);

    game.destroy();

    expect(game.getStatus()).toBe(GameStatus.DESTROYED);
    expect(game.getWorld().entities.length).toBe(0);
    expect((game as any).world.systemsList.length).toBe(0);
    // @ts-expect-error - Accessing internal EventBus handlers for verification
    expect(game.eventBus.handlers.size).toBe(0);
  });

  it("should be idempotent", () => {
    const game = new TestGame();
    game.destroy();
    expect(() => game.destroy()).not.toThrow();
  });
});
