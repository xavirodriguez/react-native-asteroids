import { World } from "../../../engine/core/World";
import {
  createShip,
  createAsteroid,
  createBullet,
  createGameState,
  spawnAsteroidWave,
  createParticle,
} from "../EntityFactory";
import { GAME_CONFIG, type HealthComponent, type TTLComponent, type AsteroidComponent, type PositionComponent, type VelocityComponent, type GameStateComponent, type RenderComponent, type ColliderComponent } from "../../../types/GameTypes";

describe("EntityFactory", () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  describe("createShip", () => {
    it("creates an entity with all necessary components", () => {
      const ship = createShip({ world, x: 100, y: 200 });
      expect(world.hasComponent(ship, "Position")).toBe(true);
      expect(world.hasComponent(ship, "Velocity")).toBe(true);
      expect(world.hasComponent(ship, "Render")).toBe(true);
      expect(world.hasComponent(ship, "Collider")).toBe(true);
      expect(world.hasComponent(ship, "Health")).toBe(true);
      expect(world.hasComponent(ship, "Input")).toBe(true);
      expect(world.hasComponent(ship, "Ship")).toBe(true);
    });

    it("sets the initial position correctly", () => {
      const ship = createShip({ world, x: 100, y: 200 });
      const pos = world.getComponent<PositionComponent>(ship, "Position")!;
      expect(pos.x).toBe(100);
      expect(pos.y).toBe(200);
    });

    it("initializes health correctly", () => {
      const ship = createShip({ world, x: 100, y: 200 });
      const health = world.getComponent<HealthComponent>(ship, "Health")!;
      expect(health.current).toBe(3);
    });
  });

  describe("createAsteroid", () => {
    it("creates a large asteroid with correct radius", () => {
      const asteroid = createAsteroid({ world, x: 10, y: 10, size: "large" });
      const collider = world.getComponent<ColliderComponent>(asteroid, "Collider")!;
      expect(collider.radius).toBe(GAME_CONFIG.ASTEROID_RADII.large);
      const data = world.getComponent<AsteroidComponent>(asteroid, "Asteroid")!;
      expect(data.size).toBe("large");
    });

    it("creates a medium asteroid with correct radius", () => {
      const asteroid = createAsteroid({ world, x: 10, y: 10, size: "medium" });
      const collider = world.getComponent<ColliderComponent>(asteroid, "Collider")!;
      expect(collider.radius).toBe(GAME_CONFIG.ASTEROID_RADII.medium);
    });

    it("creates a small asteroid with correct radius", () => {
      const asteroid = createAsteroid({ world, x: 10, y: 10, size: "small" });
      const collider = world.getComponent<ColliderComponent>(asteroid, "Collider")!;
      expect(collider.radius).toBe(GAME_CONFIG.ASTEROID_RADII.small);
    });
  });

  describe("createBullet", () => {
    it("has all required components and correct TTL", () => {
      const bullet = createBullet({ world, x: 0, y: 0, angle: 0 });
      expect(world.hasComponent(bullet, "Bullet")).toBe(true);
      const ttl = world.getComponent<TTLComponent>(bullet, "TTL")!;
      expect(ttl.remaining).toBe(GAME_CONFIG.BULLET_TTL);
    });

    it("calculates velocity correctly from angle", () => {
      const bullet = createBullet({ world, x: 0, y: 0, angle: 0 });
      const vel = world.getComponent<VelocityComponent>(bullet, "Velocity")!;
      expect(vel.dx).toBeCloseTo(GAME_CONFIG.BULLET_SPEED);
      expect(vel.dy).toBeCloseTo(0);
    });
  });

  describe("createGameState", () => {
    it("initializes game state component correctly", () => {
      const entity = createGameState({ world });
      const state = world.getComponent<GameStateComponent>(entity, "GameState")!;
      expect(state.lives).toBe(3);
      expect(state.score).toBe(0);
      expect(state.level).toBe(1);
    });
  });

  describe("spawnAsteroidWave", () => {
    it("creates the specified number of asteroids", () => {
      spawnAsteroidWave({ world, count: 4 });
      const asteroids = world.query("Asteroid");
      expect(asteroids.length).toBe(4);
    });
  });

  describe("createParticle", () => {
    it("has all required components", () => {
      const particle = createParticle({ world, x: 0, y: 0, dx: 1, dy: 1, color: "white" });
      expect(world.hasComponent(particle, "Position")).toBe(true);
      expect(world.hasComponent(particle, "Velocity")).toBe(true);
      expect(world.hasComponent(particle, "Render")).toBe(true);
      expect(world.hasComponent(particle, "TTL")).toBe(true);

      const render = world.getComponent<RenderComponent>(particle, "Render")!;
      expect(render.shape).toBe("particle");
    });
  });
});
