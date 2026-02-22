import { World } from "../../ecs-world";
import { GameStateSystem } from "../GameStateSystem";
import { HealthComponent, GameStateComponent } from "../../../types/GameTypes";

describe("GameStateSystem", () => {
  let world: World;
  let system: GameStateSystem;

  beforeEach(() => {
    world = new World();
    system = new GameStateSystem();
    world.addSystem(system);
  });

  it("should decrement invulnerability and synchronize lives", () => {
    const ship = world.createEntity();
    world.addComponent(ship, { type: "Health", current: 2, max: 3, invulnerableRemaining: 1000 });
    world.addComponent(ship, { type: "Input", thrust: false, rotateLeft: false, rotateRight: false, shoot: false });

    const state = world.createEntity();
    world.addComponent(state, {
        type: "GameState",
        lives: 3,
        score: 0,
        level: 1,
        asteroidsRemaining: 0,
        isGameOver: false
    });

    world.update(100);

    const health = world.getComponent(ship, "Health") as HealthComponent;
    expect(health.invulnerableRemaining).toBe(900);

    const gameState = world.getComponent(state, "GameState") as GameStateComponent;
    expect(gameState.lives).toBe(2);
  });
});
