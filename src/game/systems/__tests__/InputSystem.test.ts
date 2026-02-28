import { World } from "../../ecs-world";
import { InputSystem } from "../InputSystem";
import { GAME_CONFIG, type Entity, type PositionComponent, type VelocityComponent, type RenderComponent, type InputComponent } from "../../../types/GameTypes";

describe("InputSystem", () => {
  let world: World;
  let system: InputSystem;
  let ship: Entity;

  beforeEach(() => {
    world = new World();
    system = new InputSystem();
    world.addSystem(system);

    ship = world.createEntity();
    world.addComponent(ship, { type: "Position", x: 400, y: 300 });
    world.addComponent(ship, { type: "Velocity", dx: 0, dy: 0 });
    world.addComponent(ship, { type: "Render", shape: "triangle", size: 10, color: "white", rotation: 0 });
    world.addComponent(ship, {
      type: "Input",
      thrust: false,
      rotateLeft: false,
      rotateRight: false,
      shoot: false,
      shootCooldownRemaining: 0,
    });
  });

  it("should update rotation when rotating left", () => {
    system.setInput({ rotateLeft: true });

    // Update with 1 second (1000ms)
    world.update(1000);

    const render = world.getComponent<RenderComponent>(ship, "Render")!;
    expect(render.rotation).toBeCloseTo(-GAME_CONFIG.SHIP_ROTATION_SPEED);
  });

  it("should update rotation when rotating right", () => {
    system.setInput({ rotateRight: true });

    // Update with 1 second (1000ms)
    world.update(1000);

    const render = world.getComponent<RenderComponent>(ship, "Render")!;
    expect(render.rotation).toBeCloseTo(GAME_CONFIG.SHIP_ROTATION_SPEED);
  });

  it("should apply thrust in the direction of rotation", () => {
    const render = world.getComponent<RenderComponent>(ship, "Render")!;
    render.rotation = Math.PI / 2; // Pointing down

    system.setInput({ thrust: true });

    // Update with 1 second (1000ms)
    world.update(1000);

    const vel = world.getComponent<VelocityComponent>(ship, "Velocity")!;
    // dx should be close to 0, dy should be close to SHIP_THRUST
    // Note: friction (0.99) is applied in the InputSystem
    expect(vel.dx).toBeCloseTo(0);
    expect(vel.dy).toBeCloseTo(GAME_CONFIG.SHIP_THRUST * 0.99);
  });

  it("should handle shooting and respect cooldown", () => {
    system.setInput({ shoot: true });

    // Initial shot
    world.update(16);

    let bullets = world.query("TTL");
    expect(bullets.length).toBe(1);

    // Try to shoot again immediately (within cooldown)
    world.update(16);
    bullets = world.query("TTL");
    expect(bullets.length).toBe(1); // Still only 1 bullet

    // Wait for cooldown
    world.update(GAME_CONFIG.BULLET_SHOOT_COOLDOWN);

    // Shoot again
    world.update(16);
    bullets = world.query("TTL");
    expect(bullets.length).toBe(2);
  });

  it("should update input state component", () => {
    system.setInput({ thrust: true, shoot: true });
    world.update(16);

    const input = world.getComponent<InputComponent>(ship, "Input")!;
    expect(input.thrust).toBe(true);
    expect(input.shoot).toBe(true);
    expect(input.rotateLeft).toBe(false);
  });
});
