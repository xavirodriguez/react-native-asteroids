import { World } from "../../engine/core/World";
import { INITIAL_GAME_STATE, GAME_CONFIG } from "./types/AsteroidTypes";
import { AsteroidConfig } from "./types/AsteroidConfigSchema";
import {
    TransformComponent,
    VelocityComponent,
    RenderComponent,
    Collider2DComponent,
    TTLComponent,
    FrictionComponent,
    BoundaryComponent,
    HealthComponent,
    ManualMovementComponent,
    TrailComponent,
    SpatialNodeComponent,
    LootTableComponent,
    ReclaimableComponent
} from "../../engine/core/CoreComponents";
import { CollisionLayers } from "../../engine/physics/collision/CollisionLayers";
import { createEmitter } from "../../engine/systems/ParticleSystem";
import { generateStarField } from "../../engine/rendering/StarField";
import {
    InputComponent,
    UfoComponent,
    GameStateComponent
} from "./types/AsteroidTypes";
import { ShipComponent, BulletComponent, AsteroidComponent } from "../../engine/core/CoreComponents";
import { Component, Entity } from "../../engine/types/EngineTypes";
import { EnemyFactory } from "../../factories/EnemyFactory";
import { EnemyBlueprints } from "../../data/blueprints/EnemyBlueprints";
import { EntityBlueprintAssembler } from "../../factories/EntityBlueprintAssembler";
import { BlueprintOverrides } from "../../data/blueprints/types/BlueprintTypes";

/**
 * Factoría de entidades para el dominio del juego Asteroids.
 */

const createBaseEntity = (world: World, deferred?: boolean): { entity: Entity, add: (comp: Component) => void } => {
    const isUpdating = world.isUpdating;
    const isDeferred = !!(deferred || isUpdating);
    const commands = world.getCommandBuffer();

    if (isDeferred) {
        const entity = world.reserveEntityId();
        commands.createEntity(entity);
        return {
            entity,
            add: (comp: Component) => {
                commands.addComponent(entity, comp);
            }
        };
    }

    const entity = world.createEntity();
    return {
        entity,
        add: (comp: Component) => world.addComponent(entity, comp)
    };
};

export const createShip = ({ world, x, y, deferred }: { world: World; x: number; y: number, deferred?: boolean }) => {
  const config = world.getResource<AsteroidConfig>("GameConfig") || GAME_CONFIG;
  const { entity: ship, add } = createBaseEntity(world, deferred);

  add({ type: "Transform", x, y, rotation: -Math.PI / 2, scaleX: 1, scaleY: 1 } as TransformComponent);
  add({ type: "Velocity", dx: 0, dy: 0 } as VelocityComponent);
  add({
    type: "Friction",
    value: config.SHIP_FRICTION,
  } as FrictionComponent);
  add({
    type: "Boundary",
    x: 0, y: 0,
    width: config.SCREEN_WIDTH,
    height: config.SCREEN_HEIGHT,
    behavior: "wrap",
  } as BoundaryComponent);
  add({
    type: "Render",
    shape: "ship_sprite",
    size: config.SHIP_RENDER_SIZE,
    color: "white",
    rotation: -Math.PI / 2,
  } as RenderComponent);
  add({
    type: "Collider2D",
    shape: { type: "circle", radius: config.SHIP_COLLIDER_RADIUS },
    layer: CollisionLayers.PLAYER,
    mask: CollisionLayers.ENEMY | CollisionLayers.DEBRIS | CollisionLayers.PICKUP,
    offsetX: 0,
    offsetY: 0,
    isTrigger: false,
    enabled: true
  } as Collider2DComponent);
  add({ type: "Ship", score: 0, hyperspaceTimer: 0, hyperspaceCooldownRemaining: 0 } as ShipComponent);
  add({
    type: "Trail",
    points: new Array(config.TRAIL_MAX_LENGTH),
    currentIndex: 0,
    count: 0,
    maxLength: config.TRAIL_MAX_LENGTH
  } as TrailComponent);
  add({ type: "Input", thrust: false, rotateLeft: false, rotateRight: false, shoot: false, hyperspace: false, shootCooldownRemaining: 0 } as InputComponent);
  add({ type: "Health", current: 3, max: 3, invulnerableRemaining: config.INVULNERABILITY_DURATION } as HealthComponent);
  add({ type: "ManualMovement" } as ManualMovementComponent);
  add({ type: "SpatialNode", lastCellKeys: [], active: true } as SpatialNodeComponent);

  createEmitter(world, {
    position: { x, y },
    rate: 0,
    burst: 5,
    lifetime: { min: 1.5, max: 2.0 },
    speed: { min: 5, max: 15 },
    angle: { min: 0, max: 360 },
    size: { min: 2, max: 4 },
    color: ["#4488FF"],
    loop: false
  });

  return ship;
};

export const createBullet = ({ world, x, y, angle, ownerId, deferred }: { world: World; x: number; y: number; angle: number; ownerId?: string, deferred?: boolean }) => {
  const config = world.getResource<AsteroidConfig>("GameConfig") || GAME_CONFIG;
  const dx = Math.cos(angle) * config.BULLET_SPEED;
  const dy = Math.sin(angle) * config.BULLET_SPEED;

  const overrides: BlueprintOverrides = {
    physics: {
        maxSpeed: config.BULLET_SPEED,
        dx,
        dy
    },
    render: {
        shape: "bullet",
        size: config.BULLET_SIZE,
        color: "white",
        zIndex: 10,
        rotation: angle
    }
  };

  let bullet: Entity;
  if (deferred || world.isUpdating) {
    bullet = world.reserveEntityId();
    EntityBlueprintAssembler.assemble(world, "player_bullet", x, y, overrides, world.getCommandBuffer(), bullet);
  } else {
    bullet = world.spawnFromBlueprint("player_bullet", x, y, overrides);
  }

  const add = (comp: Component) => {
    if (deferred || world.isUpdating) {
        world.getCommandBuffer().addComponent(bullet, comp);
    } else {
        world.addComponent(bullet, comp);
    }
  };

  add({ type: "Bullet", ownerId } as BulletComponent);
  return bullet;
};

export const createAsteroid = ({ world, x, y, size, deferred }: { world: World; x: number; y: number; size: "large" | "medium" | "small", deferred?: boolean }) => {
  const config = world.getResource<AsteroidConfig>("GameConfig") || GAME_CONFIG;
  const blueprintId = `${size}_asteroid`;

  const gameplayRandom = world.gameplayRandom;
  const radius = config.ASTEROID_RADII[size];
  const angle = gameplayRandom.next() * Math.PI * 2;
  const speed = gameplayRandom.nextRange(60, 160) * (size === "large" ? 1 : size === "medium" ? 1.5 : 2);
  const rotation = gameplayRandom.next() * Math.PI * 2;

  const vertices = [];
  const vertexCount = 8 + gameplayRandom.nextInt(0, 5);
  for (let i = 0; i < vertexCount; i++) {
    const a = (i / vertexCount) * Math.PI * 2;
    const r = radius * gameplayRandom.nextRange(0.8, 1.2);
    vertices.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }

  const internalLines = [];
  const crackCount = 2 + gameplayRandom.nextInt(0, 3);
  for (let i = 0; i < crackCount; i++) {
      const v1 = vertices[gameplayRandom.nextInt(0, vertices.length)];
      const v2 = { x: v1.x * 0.3, y: v1.y * 0.3 };
      internalLines.push({ x1: v1.x, y1: v1.y, x2: v2.x, y2: v2.y });
  }

  const asteroid = EnemyFactory.createEnemy(world, blueprintId, x, y, {
      velocity: { dx: Math.cos(angle) * speed, dy: Math.sin(angle) * speed },
      rotation,
      vertices,
      renderData: { internalLines }
  }, deferred);

  const blueprint = EnemyBlueprints[blueprintId];

  const add = (comp: Component) => {
      if (deferred || world.isUpdating) {
          world.getCommandBuffer().addComponent(asteroid, comp);
      } else {
          world.addComponent(asteroid, comp);
      }
  };

  if (blueprint && blueprint.kind === 'asteroid') {
      add({
          type: "Asteroid",
          size,
          splitsInto: blueprint.asteroid.splitsInto,
          splitCount: blueprint.asteroid.splitCount
      } as AsteroidComponent);
  } else {
      add({ type: "Asteroid", size } as AsteroidComponent);
  }

  if (size === "large") {
      add({ type: "Reclaimable", poolId: "AsteroidPool" } as ReclaimableComponent);
  }

  const lootTable: LootTableComponent = {
    type: "LootTable",
    drops: [
      { type: "triple_shot", chance: size === "large" ? 0.2 : 0.05, config: { duration: 8000 } },
      { type: "shield", chance: 0.05, config: { duration: 5000 } },
      { type: "speed", chance: 0.05, config: { duration: 6000 } }
    ]
  };
  add(lootTable);

  return asteroid;
};

export const spawnAsteroidWave = ({ world, count, deferred }: { world: World; count: number, deferred?: boolean }) => {
  const config = world.getResource<AsteroidConfig>("GameConfig") || GAME_CONFIG;
  const gameplayRandom = world.gameplayRandom;
  for (let i = 0; i < count; i++) {
    let x, y, dist;
    do {
      x = gameplayRandom.nextRange(0, config.SCREEN_WIDTH);
      y = gameplayRandom.nextRange(0, config.SCREEN_HEIGHT);
      dist = Math.sqrt(Math.pow(x - config.SCREEN_CENTER_X, 2) + Math.pow(y - config.SCREEN_CENTER_Y, 2));
    } while (dist < config.INITIAL_ASTEROID_SPAWN_RADIUS);

    createAsteroid({ world, x, y, size: "large", deferred });
  }
};

export const createUfo = ({ world, deferred }: { world: World, deferred?: boolean }) => {
  const config = world.getResource<AsteroidConfig>("GameConfig") || GAME_CONFIG;
  const gameplayRandom = world.gameplayRandom;
  const side = gameplayRandom.next() > 0.5 ? 0 : config.SCREEN_WIDTH;
  const y = gameplayRandom.nextRange(0, config.SCREEN_HEIGHT);

  const ufo = EnemyFactory.createEnemy(world, "ufo_scout", side, y, {
      velocity: { dx: side === 0 ? config.UFO_SPEED : -config.UFO_SPEED, dy: 0 }
  }, deferred);

  const add = (comp: Component) => {
      if (deferred || world.isUpdating) {
          world.getCommandBuffer().addComponent(ufo, comp);
      } else {
          world.addComponent(ufo, comp);
      }
  };

  add({ type: "Ufo", baseY: y, time: 0 } as UfoComponent);

  return ufo;
};

export interface CreateParticleParams {
    world: World;
    x: number;
    y: number;
    dx: number;
    dy: number;
    color: string;
    ttl?: number;
    size?: number;
    deferred?: boolean;
}

export const createParticle = (params: CreateParticleParams) => {
  const config = params.world.getResource<AsteroidConfig>("GameConfig") || GAME_CONFIG;
  const { world, x, y, dx, dy, color, ttl = config.PARTICLE_TTL_BASE, size = 2, deferred } = params;
  const { entity: particle, add } = createBaseEntity(world, deferred);

  add({ type: "Transform", x, y, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
  add({ type: "Velocity", dx, dy } as VelocityComponent);
  add({ type: "Render", shape: "particle", size, color, rotation: 0 } as RenderComponent);
  add({ type: "TTL", remaining: ttl, total: ttl } as TTLComponent);
  return particle;
};

export const createFlash = ({ world, x, y, size, deferred }: { world: World; x: number; y: number; size: number, deferred?: boolean }) => {
  const { entity: flash, add } = createBaseEntity(world, deferred);
  add({ type: "Transform", x, y, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
  add({ type: "Render", shape: "flash", size, color: "white", rotation: 0 } as RenderComponent);
  add({ type: "TTL", remaining: 100, total: 100 } as TTLComponent);
  return flash;
};

export const createGameState = ({ world, deferred, headless = false }: { world: World, deferred?: boolean, headless?: boolean }) => {
  const config = world.getResource<AsteroidConfig>("GameConfig") || GAME_CONFIG;
  const { entity: gameState, add } = createBaseEntity(world, deferred);
  add({
    ...INITIAL_GAME_STATE,
    lives: config.SHIP_INITIAL_LIVES,
    stars: headless ? [] : generateStarField(config.STAR_COUNT, config.SCREEN_WIDTH, config.SCREEN_HEIGHT, world),
    screenShake: null,
    debugCRT: false,
    type: "GameState"
  } as GameStateComponent);
  return gameState;
};
