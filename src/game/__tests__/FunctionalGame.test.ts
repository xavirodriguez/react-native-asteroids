import { AsteroidsGame } from "../AsteroidsGame";
import { type VelocityComponent, type PositionComponent } from "../../types/GameTypes";

describe("Functional Game Verification", () => {
  let game: AsteroidsGame;

  beforeEach(() => {
    // Mock performance.now for deterministic delta time calculation
    jest.spyOn(performance, 'now').mockReturnValue(0);
    // Mock requestAnimationFrame to prevent actual loop
    jest.spyOn(global, 'requestAnimationFrame').mockImplementation(() => 0);
    game = new AsteroidsGame();
    game.start();
  });

  afterEach(() => {
    game.destroy();
    jest.restoreAllMocks();
  });

  it("should move the ship when thrust is applied", () => {
    const world = game.getWorld();
    const ship = world.query("Ship", "Velocity", "Position")[0];
    const velocity = world.getComponent<VelocityComponent>(ship, "Velocity")!;
    const position = world.getComponent<PositionComponent>(ship, "Position")!;

    const initialX = position.x;

    // Apply thrust
    game.setInput({ thrust: true });

    // Advance world by 100ms (max delta time)
    // We need to call world.update directly since we mocked requestAnimationFrame
    world.update(100);

    expect(velocity.dx).not.toBe(0);
    expect(position.x).not.toBe(initialX);

    // Position should have changed according to velocity
    // Actually, MovementSystem applies velocity to position
    // And InputSystem applies thrust to velocity
  });

  it("should create a bullet when shooting", () => {
    const world = game.getWorld();
    const initialBullets = world.query("Bullet").length;

    // Apply shoot
    game.setInput({ shoot: true });

    // Update world to process input and create bullet
    world.update(16);

    const currentBullets = world.query("Bullet").length;
    expect(currentBullets).toBe(initialBullets + 1);
  });

  it("should detect bullet-asteroid collisions", () => {
    const world = game.getWorld();

    // Clear asteroids to have a clean state
    const asteroids = world.query("Asteroid");
    asteroids.forEach(a => world.removeEntity(a));

    // Create an asteroid at (100, 100)
    const asteroid = world.createEntity();
    world.addComponent(asteroid, { type: "Position", x: 100, y: 100 });
    world.addComponent(asteroid, { type: "Asteroid", size: "large" });
    world.addComponent(asteroid, { type: "Collider", radius: 30 });
    world.addComponent(asteroid, { type: "Render", shape: "polygon", size: 30, color: "white", rotation: 0 });

    // Create a bullet at (100, 100)
    const bullet = world.createEntity();
    world.addComponent(bullet, { type: "Position", x: 100, y: 100 });
    world.addComponent(bullet, { type: "Bullet" });
    world.addComponent(bullet, { type: "Collider", radius: 2 });
    world.addComponent(bullet, { type: "Render", shape: "circle", size: 2, color: "white", rotation: 0 });

    const initialScore = game.getGameState().score;

    // Update world to trigger CollisionSystem
    world.update(16);

    // Score should have increased
    expect(game.getGameState().score).toBeGreaterThan(initialScore);

    // Bullet should be removed (or marked for removal)
    expect(world.hasComponent(bullet, "Bullet")).toBe(false);
  });
});
