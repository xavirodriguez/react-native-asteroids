import { World } from "../../engine/core/World";
import { AsteroidsGame } from "./AsteroidsGame";
import { GAME_CONFIG, INITIAL_GAME_STATE } from "../../types/GameTypes";
import { PositionComponent, VelocityComponent, RenderComponent, ColliderComponent, TTLComponent } from "../../engine/core/CoreComponents";
import { generateStarField } from "../../game/StarField";

export const createShip = ({ world, x, y }: { world: World; x: number; y: number }) => {
  const ship = world.createEntity();
  world.addComponent(ship, { type: "Position", x, y } as PositionComponent);
  world.addComponent(ship, { type: "Velocity", dx: 0, dy: 0 } as VelocityComponent);
  world.addComponent(ship, {
    type: "Render",
    shape: "triangle",
    size: GAME_CONFIG.SHIP_RENDER_SIZE,
    color: "white",
    rotation: -Math.PI / 2,
  } as RenderComponent);
  world.addComponent(ship, { type: "Collider", radius: GAME_CONFIG.SHIP_COLLIDER_RADIUS } as ColliderComponent);
  world.addComponent(ship, { type: "Ship", hyperspaceTimer: 0, hyperspaceCooldownRemaining: 0, trail: [] });
  world.addComponent(ship, { type: "Input", thrust: false, rotateLeft: false, rotateRight: false, shoot: false, hyperspace: false, shootCooldownRemaining: 0 });
  world.addComponent(ship, { type: "Health", current: 3, max: 3, invulnerableRemaining: GAME_CONFIG.INVULNERABILITY_DURATION });
  return ship;
};

export const createBullet = ({ world, x, y, dx, dy }: { world: World; x: number; y: number; dx: number; dy: number }) => {
  const bullet = world.createEntity();
  world.addComponent(bullet, { type: "Position", x, y } as PositionComponent);
  world.addComponent(bullet, { type: "Velocity", dx, dy } as VelocityComponent);
  world.addComponent(bullet, { type: "Render", shape: "circle", size: GAME_CONFIG.BULLET_SIZE, color: "white", rotation: 0 } as RenderComponent);
  world.addComponent(bullet, { type: "Collider", radius: GAME_CONFIG.BULLET_SIZE } as ColliderComponent);
  world.addComponent(bullet, { type: "TTL", remaining: GAME_CONFIG.BULLET_TTL, total: GAME_CONFIG.BULLET_TTL } as TTLComponent);
  world.addComponent(bullet, { type: "Bullet" });
  return bullet;
};

export const createAsteroid = ({ world, x, y, size }: { world: World; x: number; y: number; size: "large" | "medium" | "small" }) => {
  const asteroid = world.createEntity();
  const radius = GAME_CONFIG.ASTEROID_RADII[size];
  const angle = Math.random() * Math.PI * 2;
  const speed = (Math.random() * 50 + 20) * (size === "large" ? 1 : size === "medium" ? 1.5 : 2);

  const vertices = [];
  const vertexCount = 8 + Math.floor(Math.random() * 5);
  for (let i = 0; i < vertexCount; i++) {
    const a = (i / vertexCount) * Math.PI * 2;
    const r = radius * (0.8 + Math.random() * 0.4);
    vertices.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }

  const internalLines = [];
  const crackCount = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < crackCount; i++) {
      const v1 = vertices[Math.floor(Math.random() * vertices.length)];
      const v2 = { x: v1.x * 0.3, y: v1.y * 0.3 };
      internalLines.push({ x1: v1.x, y1: v1.y, x2: v2.x, y2: v2.y });
  }

  const colors = { large: "#555555", medium: "#8B4513", small: "#AAAAAA" };

  world.addComponent(asteroid, { type: "Position", x, y } as PositionComponent);
  world.addComponent(asteroid, { type: "Velocity", dx: Math.cos(angle) * speed, dy: Math.sin(angle) * speed } as VelocityComponent);
  world.addComponent(asteroid, {
    type: "Render",
    shape: "polygon",
    size: radius,
    color: colors[size],
    rotation: Math.random() * Math.PI * 2,
    angularVelocity: (Math.random() - 0.5) * 0.04,
    vertices,
    data: { internalLines, hitFlashFrames: 0 }
  } as RenderComponent);
  world.addComponent(asteroid, { type: "Collider", radius } as ColliderComponent);
  world.addComponent(asteroid, { type: "Asteroid", size });
  return asteroid;
};

export const spawnAsteroidWave = ({ world, count }: { world: World; count: number }) => {
  for (let i = 0; i < count; i++) {
    let x, y, dist;
    do {
      x = Math.random() * GAME_CONFIG.SCREEN_WIDTH;
      y = Math.random() * GAME_CONFIG.SCREEN_HEIGHT;
      dist = Math.sqrt(Math.pow(x - GAME_CONFIG.SCREEN_CENTER_X, 2) + Math.pow(y - GAME_CONFIG.SCREEN_CENTER_Y, 2));
    } while (dist < GAME_CONFIG.INITIAL_ASTEROID_SPAWN_RADIUS);

    createAsteroid({ world, x, y, size: "large" });
  }
};

export const createUfo = ({ world }: { world: World }) => {
  const ufo = world.createEntity();
  const side = Math.random() > 0.5 ? 0 : GAME_CONFIG.SCREEN_WIDTH;
  const y = Math.random() * GAME_CONFIG.SCREEN_HEIGHT;

  world.addComponent(ufo, { type: "Position", x: side, y } as PositionComponent);
  world.addComponent(ufo, { type: "Velocity", dx: side === 0 ? GAME_CONFIG.UFO_SPEED : -GAME_CONFIG.UFO_SPEED, dy: 0 } as VelocityComponent);
  world.addComponent(ufo, { type: "Render", shape: "ufo", size: GAME_CONFIG.UFO_SIZE, color: "#00FF00", rotation: 0 } as RenderComponent);
  world.addComponent(ufo, { type: "Collider", radius: GAME_CONFIG.UFO_SIZE } as ColliderComponent);
  world.addComponent(ufo, { type: "Ufo", baseY: y, time: 0 });
  return ufo;
};

export const createParticle = ({ world, x, y, color }: { world: World; x: number; y: number; color: string }) => {
  const particle = world.createEntity();
  const angle = Math.random() * Math.PI * 2;
  const speed = Math.random() * GAME_CONFIG.PARTICLE_SPEED_BASE + 20;
  const ttl = Math.random() * GAME_CONFIG.PARTICLE_TTL_BASE + 200;

  world.addComponent(particle, { type: "Position", x, y } as PositionComponent);
  world.addComponent(particle, { type: "Velocity", dx: Math.cos(angle) * speed, dy: Math.sin(angle) * speed } as VelocityComponent);
  world.addComponent(particle, { type: "Render", shape: "particle", size: 2, color, rotation: 0 } as RenderComponent);
  world.addComponent(particle, { type: "TTL", remaining: ttl, total: ttl } as TTLComponent);
  return particle;
};

export const createFlash = ({ world, x, y, size }: { world: World; x: number; y: number; size: number }) => {
  const flash = world.createEntity();
  world.addComponent(flash, { type: "Position", x, y } as PositionComponent);
  world.addComponent(flash, { type: "Render", shape: "flash", size, color: "white", rotation: 0 } as RenderComponent);
  world.addComponent(flash, { type: "TTL", remaining: 100, total: 100 } as TTLComponent);
  return flash;
};

export const createGameState = ({ world }: { world: World }) => {
  const gameState = world.createEntity();
  world.addComponent(gameState, {
    ...INITIAL_GAME_STATE,
    lives: GAME_CONFIG.SHIP_INITIAL_LIVES,
    stars: generateStarField(GAME_CONFIG.STAR_COUNT, GAME_CONFIG.SCREEN_WIDTH, GAME_CONFIG.SCREEN_HEIGHT),
    screenShake: null,
    debugCRT: true,
  });
  return gameState;
};
