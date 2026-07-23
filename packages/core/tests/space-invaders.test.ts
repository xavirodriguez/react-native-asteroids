import { World, SystemPhase } from "../src";
import { SpaceInvadersCollisionSystem } from "../src/games/space-invaders/systems/SpaceInvadersCollisionSystem";
import { SpaceInvadersGameStateSystem } from "../src/games/space-invaders/systems/SpaceInvadersGameStateSystem";
import { SpaceInvadersComponentRegistry } from "../src/games/space-invaders/types/SpaceInvadersTypes";
import { createGameState } from "../src/games/space-invaders/EntityFactory";
import { ParticlePool } from "../src/games/space-invaders/EntityPool";
import { CollisionEventsComponent } from "../src/ecs/CoreComponents";

describe("Space Invaders Combo Logic & Performance", () => {
  let world: World<SpaceInvadersComponentRegistry>;
  let collisionSystem: SpaceInvadersCollisionSystem;
  let gameStateSystem: SpaceInvadersGameStateSystem;
  let particlePool: ParticlePool;

  beforeEach(() => {
    world = new World<SpaceInvadersComponentRegistry>();

    const mockConfig = {
      KEYS: {
        LEFT: "ArrowLeft",
        RIGHT: "ArrowRight",
        SHOOT: "Space",
        PAUSE: "KeyP",
        RESTART: "KeyR",
      },
      PLAYER_SPEED: 300,
      PLAYER_INITIAL_LIVES: 3,
      PLAYER_SHOOT_COOLDOWN: 500,
      PLAYER_RENDER_WIDTH: 40,
      PLAYER_COLLIDER_RADIUS: 15,
      PLAYER_BULLET_SPEED: 500,
      PLAYER_BULLET_SIZE: 4,
      PLAYER_BULLET_TTL: 2000,
      ENEMY_BULLET_SPEED: 250,
      ENEMY_BULLET_SIZE: 4,
      ENEMY_BULLET_TTL: 3000,
      ENEMY_FIRE_INTERVAL_MIN: 1000,
      ENEMY_FIRE_INTERVAL_MAX: 3000,
      INVADER_ROWS: 5,
      INVADER_COLS: 11,
      INVADER_SPACING_X: 50,
      INVADER_SPACING_Y: 40,
      INVADER_START_X: 100,
      INVADER_START_Y: 100,
      INVADER_SPEED_BASE: 50,
      INVADER_SPEED_MAX: 400,
      INVADER_DESCENT_STEP: 20,
      SHIELD_COUNT: 4,
      SHIELD_SEGMENTS_X: 4,
      SHIELD_SEGMENTS_Y: 3,
      SHIELD_SEGMENT_HP: 3,
      SHIELD_START_Y: 480,
      SHIELD_WIDTH: 60,
      SHIELD_HEIGHT: 40,
      SHIELD_SPACING: 150,
      SHIELD_START_X: 100,
      SHIELD_SEGMENT_SIZE: 15,
      PARTICLE_COUNT: 8,
      PARTICLE_TTL_BASE: 500,
      COMBO_TIMEOUT: 2000, // 2 seconds
      MAX_MULTIPLIER: 5,
    };
    world.setResource("GameConfig", mockConfig);

    particlePool = new ParticlePool();
    collisionSystem = new SpaceInvadersCollisionSystem(particlePool);

    const mockGame = {
      isMultiplayer: false,
      isPaused: false,
      unifiedInput: {},
    } as any;
    gameStateSystem = new SpaceInvadersGameStateSystem(mockGame);

    world.addSystem(collisionSystem, { phase: SystemPhase.GameRules });
    world.addSystem(gameStateSystem, { phase: SystemPhase.GameRules });
  });

  it("should initialize GameState with correct default combo values and no Combo component", () => {
    createGameState(world);
    const gameState = world.getSingleton("GameState");
    expect(gameState).toBeDefined();
    expect(gameState?.combo).toBe(0);
    expect(gameState?.multiplier).toBe(1);
    expect(gameState?.comboTimerRemaining).toBe(0);

    // Verify Combo component does not exist in world
    const comboEntities = world.query("Combo" as any);
    expect(comboEntities.length).toBe(0);
  });

  it("should increment combo and reset timer on invader destruction", () => {
    createGameState(world);

    // Add a dummy Boss to prevent wave spawning from level progression
    const dummyBoss = world.createEntity();
    world.addComponent(dummyBoss, { type: "Boss", hp: 10, maxHp: 10, timer: 0, phase: 1 });

    // Create an invader with CollisionEvents
    const invader = world.createEntity();
    world.addComponent(invader, { type: "Invader", row: 0, col: 0, points: 10 });
    world.addComponent(invader, { type: "Transform", x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1, worldX: 100, worldY: 100, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false });
    world.addComponent(invader, { type: "Render", shape: "invader", size: 20, color: "#FFF", visible: true, opacity: 1, order: 0, hitFlashFrames: 0, angularVelocity: 0, rotation: 0 });

    // Create player bullet
    const bullet = world.createEntity();
    world.addComponent(bullet, { type: "PlayerBullet" });

    // Add CollisionEvents to both invader and bullet to trigger handling
    const events: CollisionEventsComponent = {
      type: "CollisionEvents",
      collisions: [{ otherEntity: bullet, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
      activeTriggers: [],
      triggersEntered: [],
      triggersExited: []
    };
    world.addComponent(invader, events);

    const bulletEvents: CollisionEventsComponent = {
      type: "CollisionEvents",
      collisions: [{ otherEntity: invader, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
      activeTriggers: [],
      triggersEntered: [],
      triggersExited: []
    };
    world.addComponent(bullet, bulletEvents);

    // Run collision update
    world.update(0.016);

    const gameState = world.getSingleton("GameState");
    expect(gameState?.combo).toBe(1);
    expect(gameState?.comboTimerRemaining).toBeCloseTo(1.984); // 2.0 - 0.016 (due to decrement in GameStateSystem during same tick)
    expect(gameState?.multiplier).toBe(1); // 1 + floor(1/5) = 1
  });

  it("should calculate multiplier progression correctly up to MAX_MULTIPLIER", () => {
    createGameState(world);

    // Add a dummy Boss to prevent wave spawning from level progression
    const dummyBoss = world.createEntity();
    world.addComponent(dummyBoss, { type: "Boss", hp: 10, maxHp: 10, timer: 0, phase: 1 });

    const addKill = (bulletId: number) => {
      const invader = world.createEntity();
      world.addComponent(invader, { type: "Invader", row: 0, col: 0, points: 10 });
      world.addComponent(invader, { type: "Transform", x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1, worldX: 100, worldY: 100, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false });
      world.addComponent(invader, { type: "Render", shape: "invader", size: 20, color: "#FFF", visible: true, opacity: 1, order: 0, hitFlashFrames: 0, angularVelocity: 0, rotation: 0 });

      const bullet = world.createEntity();
      world.addComponent(bullet, { type: "PlayerBullet" });

      const events: CollisionEventsComponent = {
        type: "CollisionEvents",
        collisions: [{ otherEntity: bullet, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: []
      };
      world.addComponent(invader, events);

      const bulletEvents: CollisionEventsComponent = {
        type: "CollisionEvents",
        collisions: [{ otherEntity: invader, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: []
      };
      world.addComponent(bullet, bulletEvents);

      world.update(0.016);
    };

    // Kill 1
    addKill(100);
    expect(world.getSingleton("GameState")?.combo).toBe(1);
    expect(world.getSingleton("GameState")?.multiplier).toBe(1);

    // Kill up to 5 -> multiplier should become 2 (1 + floor(5/5) = 2)
    for (let i = 2; i <= 5; i++) {
      addKill(100 + i);
    }
    expect(world.getSingleton("GameState")?.combo).toBe(5);
    expect(world.getSingleton("GameState")?.multiplier).toBe(2);

    // Kill up to 25 -> multiplier capped at MAX_MULTIPLIER = 5 (1 + floor(25/5) = 6 capped to 5)
    for (let i = 6; i <= 25; i++) {
      addKill(100 + i);
    }
    expect(world.getSingleton("GameState")?.combo).toBe(25);
    expect(world.getSingleton("GameState")?.multiplier).toBe(5); // Capped at MAX_MULTIPLIER
  });

  it("should expire combo back to 0 and multiplier to 1 when COMBO_TIMEOUT is reached", () => {
    createGameState(world);

    // Mutate manually to simulate combo
    world.mutateSingleton("GameState", (gs) => {
      gs.combo = 10;
      gs.multiplier = 3;
      gs.comboTimerRemaining = 2.0;
    });

    // Advance 1.0 second -> combo timer decrements but combo is preserved
    world.update(1.0);
    let gameState = world.getSingleton("GameState");
    expect(gameState?.combo).toBe(10);
    expect(gameState?.multiplier).toBe(3);
    expect(gameState?.comboTimerRemaining).toBeCloseTo(1.0);

    // Advance another 1.1 seconds -> combo timer reaches 0 and combo expires
    world.update(1.1);
    gameState = world.getSingleton("GameState");
    expect(gameState?.combo).toBe(0);
    expect(gameState?.multiplier).toBe(1);
    expect(gameState?.comboTimerRemaining).toBe(0);
  });

  it("should NOT mutate GameState in resting state (stateVersion should only increase by invaders count query/tick)", () => {
    createGameState(world);

    // Add a dummy Boss to prevent wave spawning from level progression
    const dummyBoss = world.createEntity();
    world.addComponent(dummyBoss, { type: "Boss", hp: 10, maxHp: 10, timer: 0, phase: 1 });

    // Wait 1 tick to flush initial setup
    world.update(0.016);

    const versionBefore = world.stateVersion;

    // Run 5 consecutive resting updates
    for (let i = 0; i < 5; i++) {
      world.update(0.016);
    }

    const versionAfter = world.stateVersion;
    // Tick is incremented per update, but stateVersion increments only on component/structural mutations.
    // Since invadersRemaining is in updateGameState, that always mutates GameState once.
    // Screen shake and combo timer decrements are skipped entirely when inactive.
    // So stateVersion increases exactly by 5 (1 per tick).
    expect(versionAfter - versionBefore).toBe(5);
  });
});
