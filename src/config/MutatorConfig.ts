/**
 * Definitions and configurations for game mutators.
 */

export type GameId = 'asteroids' | 'flappybird' | 'pong' | 'spaceinvaders';

export interface Mutator {
  id: string;
  name: string;
  description: string;
  games: (GameId | 'all')[];
  apply: (config: any) => any;
}

export const MUTATORS: Mutator[] = [
  {
    id: 'double_gravity',
    name: 'Gravedad Doble',
    description: 'La gravedad es el doble de fuerte.',
    games: ['flappybird'],
    apply: (cfg) => ({ ...cfg, GRAVITY: (cfg.GRAVITY || 0) * 2 })
  },
  {
    id: 'bouncing_bullets',
    name: 'Balas Rebotantes',
    description: 'Los proyectiles rebotan en los bordes.',
    games: ['asteroids'],
    apply: (cfg) => ({ ...cfg, BULLET_BOUNDARY_BEHAVIOR: 'bounce' })
  },
  {
    id: 'blind_pong',
    name: 'Pong Ciego',
    description: 'La bola es invisible durante 1 segundo tras cada golpe.',
    games: ['pong'],
    apply: (cfg) => ({ ...cfg, BALL_INVISIBLE_AFTER_HIT_TICKS: 60 })
  },
  {
    id: 'silent_horde',
    name: 'Horda Silenciosa',
    description: 'Los enemigos no emiten sonido. Usa las sombras.',
    games: ['spaceinvaders'],
    apply: (cfg) => ({ ...cfg, ENEMY_SFX_ENABLED: false })
  },
  {
    id: 'speed_run',
    name: 'Speed Run',
    description: 'Todo se mueve un 50% más rápido.',
    games: ['asteroids', 'spaceinvaders', 'flappybird'],
    apply: (cfg) => ({
      ...cfg,
      GLOBAL_SPEED_MULTIPLIER: 1.5,
      SHIP_THRUST: (cfg.SHIP_THRUST || 0) * 1.5,
      ASTEROID_SPEED: (cfg.ASTEROID_SPEED || 0) * 1.5,
      PIPE_SPEED: (cfg.PIPE_SPEED || 0) * 1.5,
      INVADER_SPEED: (cfg.INVADER_SPEED || 0) * 1.5
    })
  },
  {
    id: 'tiny_ship',
    name: 'Nave Enana',
    description: 'Tu nave es la mitad de grande pero mucho más ágil.',
    games: ['asteroids'],
    apply: (cfg) => ({
      ...cfg,
      SHIP_SIZE: (cfg.SHIP_SIZE || 10) * 0.5,
      SHIP_ROTATION_SPEED: (cfg.SHIP_ROTATION_SPEED || 3) * 1.5
    })
  },
];
