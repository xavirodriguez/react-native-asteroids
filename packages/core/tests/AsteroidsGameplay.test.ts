import { AsteroidsGame } from "../src/games/asteroids/AsteroidsGame";
import { createAsteroid, createBullet } from "../src/games/asteroids/EntityFactory";

describe("Asteroids Singleplayer Gameplay Integration Tests", () => {
  let game: AsteroidsGame;

  beforeEach(async () => {
    game = new AsteroidsGame({ headless: true, isMultiplayer: false });
    await game.init();
  });

  afterEach(() => {
    game.destroy();
  });

  it("debería inicializar el juego con GameState, jugador local y oleada inicial de asteroides", () => {
    const world = game.getWorld();

    const gameState = world.getSingleton("GameState");
    expect(gameState).toBeDefined();
    expect(gameState?.lives).toBe(3);
    expect(gameState?.level).toBe(1);
    expect(gameState?.score).toBe(0);

    const localPlayers = world.query("LocalPlayer");
    expect(localPlayers.length).toBe(1);

    const asteroids = world.query("Asteroid");
    expect(asteroids.length).toBe(5); // INITIAL_ASTEROID_COUNT = 5
  });

  it("debería permitir al jugador disparar balas tras presionar shoot y avanzar la simulación", () => {
    const world = game.getWorld();

    const localPlayer = world.query("LocalPlayer")[0];
    expect(localPlayer).toBeDefined();

    // Simular input de disparo
    game.setInputState({ shoot: true });

    // Actualizar un tick (el cooldown de disparo se activará, creando una bala)
    game.update(0.016);

    const bullets = world.query("Bullet");
    expect(bullets.length).toBe(1);

    const bulletVel = world.getComponent(bullets[0], "Velocity");
    expect(bulletVel).toBeDefined();
    expect(bulletVel?.vx).toBeDefined();
  });

  it("debería fragmentar asteroides grandes en medianos al colisionar con una bala", () => {
    const world = game.getWorld();

    // Eliminar asteroides existentes para tener un escenario limpio
    const initialAsteroids = world.query("Asteroid");
    for (const ast of initialAsteroids) {
      world.getCommandBuffer().removeEntity(ast);
    }
    world.update(0.001); // flush deletions

    // Crear un asteroide grande y una bala colisionando en el mismo lugar (0, 0)
    const asteroid = createAsteroid({ world, x: 0, y: 0, size: "large" });
    const bullet = createBullet({ world, x: 0, y: 0, vx: 0, vy: 0, lifetime: 2.0 });

    // Ejecutar el sistema de colisión y resolver
    game.update(0.016);

    // La bala y el asteroide grande deberían estar destruidos, y aparecer 2 medianos
    const asteroids = world.query("Asteroid");
    expect(asteroids.length).toBe(2);

    for (const ast of asteroids) {
      const astComp = world.getComponent(ast, "Asteroid");
      expect(astComp?.size).toBe("medium");
    }

    // Verificar que se incrementó la puntuación
    const gameState = world.getSingleton("GameState");
    expect(gameState?.score).toBe(20); // 20 puntos por asteroide grande
  });

  it("debería ignorar colisiones si la nave es temporalmente invulnerable", () => {
    const world = game.getWorld();

    // Eliminar asteroides existentes
    const initialAsteroids = world.query("Asteroid");
    for (const ast of initialAsteroids) {
      world.getCommandBuffer().removeEntity(ast);
    }
    world.update(0.001); // flush

    const ship = world.query("LocalPlayer")[0];
    expect(ship).toBeDefined();

    // Poner la nave en (0, 0) y hacerla invulnerable
    world.mutateComponent(ship, "Transform", (t) => {
      t.x = 0;
      t.y = 0;
      t.worldX = 0;
      t.worldY = 0;
    });
    world.addComponent(ship, { type: "Invulnerable" } as any);

    // Crear un asteroide en (0, 0) colisionando con la nave
    createAsteroid({ world, x: 0, y: 0, size: "large" });

    // Actualizar simulación física y de colisiones
    game.update(0.016);

    // Dado que la nave es invulnerable, no debería destruirse
    const shipAlive = world.query("LocalPlayer");
    expect(shipAlive.length).toBe(1);
  });
});
