import { EntityBlueprint } from '../types/BlueprintTypes';
import { CollisionLayers } from '../../shared/types/CollisionLayers';

export const EnemyBlueprints: Record<string, EntityBlueprint> = {
  // --- Asteroids ---
  large_asteroid: {
    id: 'large_asteroid',
    kind: 'asteroid',
    displayName: 'Large Asteroid',
    render: { shape: 'polygon', size: 30, color: '#555555', zIndex: 10 },
    physics: { maxSpeed: 100, boundaryBehavior: "wrap" },
    collision: { radius: 30, layer: CollisionLayers.ENEMY, mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE, isTrigger: false },
    stats: { health: 1, points: 20 },
    tags: ['asteroid', 'Asteroid'],
    asteroid: { size: 'large', splitsInto: ['medium_asteroid'], splitCount: 2 }
  },

  medium_asteroid: {
    id: 'medium_asteroid',
    kind: 'asteroid',
    displayName: 'Medium Asteroid',
    render: { shape: 'polygon', size: 20, color: '#8B4513', zIndex: 10 },
    physics: { maxSpeed: 150, boundaryBehavior: "wrap" },
    collision: { radius: 20, layer: CollisionLayers.ENEMY, mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE, isTrigger: false },
    stats: { health: 1, points: 50 },
    tags: ['asteroid', 'Asteroid'],
    asteroid: { size: 'medium', splitsInto: ['small_asteroid'], splitCount: 2 }
  },

  small_asteroid: {
    id: 'small_asteroid',
    kind: 'asteroid',
    displayName: 'Small Asteroid',
    render: { shape: 'polygon', size: 10, color: '#AAAAAA', zIndex: 10 },
    physics: { maxSpeed: 200, boundaryBehavior: "wrap" },
    collision: { radius: 10, layer: CollisionLayers.ENEMY, mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE, isTrigger: false },
    stats: { health: 1, points: 100 },
    tags: ['asteroid', 'Asteroid'],
    asteroid: { size: 'small', splitsInto: [], splitCount: 0 }
  },

  // --- Invaders ---
  invader_commander: {
    id: 'invader_commander',
    kind: 'invader',
    displayName: 'Invader Commander',
    render: { shape: 'invader', size: 24, color: '#FF00FF', zIndex: 15 },
    physics: { maxSpeed: 85 },
    collision: { radius: 12, layer: CollisionLayers.ENEMY, mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE | CollisionLayers.DEBRIS, isTrigger: false },
    stats: { health: 1, points: 30 },
    tags: ['enemy', 'invader', 'Invader'],
    invader: { archetype: 'basic', fireRate: 0.8 }
  },

  invader_scout: {
    id: 'invader_scout',
    kind: 'invader',
    displayName: 'Invader Scout',
    render: { shape: 'invader', size: 24, color: '#FFFFFF', zIndex: 15 },
    physics: { maxSpeed: 85 },
    collision: { radius: 12, layer: CollisionLayers.ENEMY, mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE | CollisionLayers.DEBRIS, isTrigger: false },
    stats: { health: 1, points: 10 },
    tags: ['enemy', 'invader', 'Invader'],
    invader: { archetype: 'basic', fireRate: 0.8 }
  },

  basic_invader: {
    id: 'basic_invader',
    kind: 'invader',
    displayName: 'Basic Invader',
    render: { shape: 'invader', size: 24, color: '#FFFFFF', zIndex: 15 },
    physics: { maxSpeed: 85 },
    collision: { radius: 12, layer: CollisionLayers.ENEMY, mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE | CollisionLayers.DEBRIS, isTrigger: false },
    stats: { health: 1, points: 10 },
    tags: ['enemy', 'invader', 'Invader'],
    invader: { archetype: 'basic', fireRate: 0.8 }
  },

  elite_invader: {
    id: 'elite_invader',
    kind: 'invader',
    displayName: 'Elite Invader',
    render: { shape: 'invader', size: 24, color: '#00FFFF', zIndex: 15 },
    physics: { maxSpeed: 110 },
    collision: { radius: 12, layer: CollisionLayers.ENEMY, mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE | CollisionLayers.DEBRIS, isTrigger: false },
    stats: { health: 3, points: 50 },
    tags: ['enemy', 'invader', 'Invader', 'Elite'],
    invader: { archetype: 'elite', fireRate: 1.4 }
  },

  // --- UFOs ---
  ufo_scout: {
    id: 'ufo_scout',
    kind: 'ufo',
    displayName: 'UFO Scout',
    render: { shape: 'ufo', size: 15, color: '#00FF00', zIndex: 20 },
    physics: { maxSpeed: 120, boundaryBehavior: "wrap" },
    collision: { radius: 15, layer: CollisionLayers.ENEMY, mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE, isTrigger: false },
    stats: { health: 1, points: 200 },
    tags: ['enemy', 'ufo', 'Ufo'],
    ufo: { behavior: 'zigzag', scoreBonus: 100 }
  },

  // --- Projectiles ---
  player_bullet: {
    id: 'player_bullet',
    kind: 'projectile',
    displayName: 'Player Bullet',
    render: { shape: 'circle', size: 2, color: '#FFFFFF', zIndex: 25 },
    physics: { maxSpeed: 300, ttl: 2000 },
    collision: { radius: 2, layer: CollisionLayers.PROJECTILE, mask: CollisionLayers.ENEMY, isTrigger: true },
    stats: { health: 1, points: 0 },
    tags: ['bullet', 'player_projectile'],
    projectile: { ownerType: 'player', damage: 1 }
  },

  enemy_bullet: {
    id: 'enemy_bullet',
    kind: 'projectile',
    displayName: 'Enemy Bullet',
    render: { shape: 'circle', size: 2, color: '#FF0000', zIndex: 25 },
    physics: { maxSpeed: 200, ttl: 3000 },
    collision: { radius: 2, layer: CollisionLayers.PROJECTILE, mask: CollisionLayers.PLAYER, isTrigger: true },
    stats: { health: 1, points: 0 },
    tags: ['bullet', 'enemy_projectile'],
    projectile: { ownerType: 'enemy', damage: 1 }
  }
} as const;
