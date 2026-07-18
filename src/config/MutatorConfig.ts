import { z } from "zod";

/**
 * Definitions and configurations for game mutators.
 */

export type GameId = 'asteroids' | 'flappybird' | 'pong' | 'space-invaders';

/**
 * Schema to enforce strict, safe physical boundaries on mutated parameters,
 * preventing division-by-zero, numerical overflow, or drift in collision/CCD systems.
 */
export const PhysicsSafetySchema = z.object({
  SHIP_THRUST: z.number().min(0).max(10000).optional(),
  FRICTION: z.number().min(0).max(1).optional(),
  GRAVITY: z.number().min(0).max(10000).optional(),
  SHIP_SIZE: z.number().gt(0).max(1000).optional(),
  BALL_SIZE: z.number().gt(0).max(1000).optional(),
  ASTEROID_SPEED: z.number().min(0).max(5000).optional(),
  PIPE_SPEED: z.number().min(0).max(5000).optional(),
  INVADER_SPEED: z.number().min(0).max(5000).optional(),
  GLOBAL_SPEED_MULTIPLIER: z.number().min(0).max(10).optional(),
  BALL_INVISIBLE_AFTER_HIT_TICKS: z.number().min(0).max(600).optional()
}).catchall(z.any());

export interface Mutator {
  id: string;
  name: string;
  description: string;
  games: (GameId | 'all')[];
  apply: (config: Record<string, unknown>) => Record<string, unknown>;
}

const rawMutators: Mutator[] = [
  {
    id: 'heavy_gravity',
    name: 'Heavy Gravity',
    description: 'La gravedad es el doble de fuerte.',
    games: ['flappybird'],
    apply: (cfg) => ({ ...cfg, GRAVITY: ((cfg.GRAVITY as number) || 0) * 2 })
  },
  {
    id: 'hyper_drift',
    name: 'Hyper Drift',
    description: 'Nave con mucha inercia y potencia.',
    games: ['asteroids'],
    apply: (cfg) => ({
      ...cfg,
      SHIP_THRUST: ((cfg.SHIP_THRUST as number) || 0) * 2.0,
      FRICTION: 0.95 // Menos fricción para más "drift"
    })
  },
  {
    id: 'ghost_ball',
    name: 'Ghost Ball',
    description: 'La bola es invisible durante 1 segundo tras cada golpe.',
    games: ['pong'],
    apply: (cfg) => ({ ...cfg, BALL_INVISIBLE_AFTER_HIT_TICKS: 60 })
  },
  {
    id: 'bouncing_bullets',
    name: 'Balas Rebotantes',
    description: 'Los proyectiles rebotan en los bordes.',
    games: ['asteroids'],
    apply: (cfg) => ({ ...cfg, BULLET_BOUNDARY_BEHAVIOR: 'bounce' })
  },
  {
    id: 'silent_horde',
    name: 'Horda Silenciosa',
    description: 'Los enemigos no emiten sonido. Usa las sombras.',
    games: ['space-invaders'],
    apply: (cfg) => ({ ...cfg, ENEMY_SFX_ENABLED: false })
  },
  {
    id: 'speed_run',
    name: 'Speed Run',
    description: 'Todo se mueve un 50% más rápido.',
    games: ['asteroids', 'space-invaders', 'flappybird'],
    apply: (cfg) => ({
      ...cfg,
      GLOBAL_SPEED_MULTIPLIER: 1.5,
      SHIP_THRUST: ((cfg.SHIP_THRUST as number) || 0) * 1.5,
      ASTEROID_SPEED: ((cfg.ASTEROID_SPEED as number) || 0) * 1.5,
      PIPE_SPEED: ((cfg.PIPE_SPEED as number) || 0) * 1.5,
      INVADER_SPEED: ((cfg.INVADER_SPEED as number) || 0) * 1.5
    })
  },
  {
    id: 'tiny_ship',
    name: 'Nave Enana',
    description: 'Tu nave es la mitad de grande pero mucho más ágil.',
    games: ['asteroids'],
    apply: (cfg) => ({
      ...cfg,
      SHIP_SIZE: ((cfg.SHIP_SIZE as number) || 10) * 0.5,
      SHIP_ROTATION_SPEED: ((cfg.SHIP_ROTATION_SPEED as number) || 3) * 1.5
    })
  },
];

// Wrap each mutator's apply function with safety validation
export const MUTATORS: Mutator[] = rawMutators.map(mutator => ({
  ...mutator,
  apply: (config) => {
    const mutated = mutator.apply(config);
    const parsed = PhysicsSafetySchema.safeParse(mutated);
    if (!parsed.success) {
      throw new Error(`Physics safety validation failed after applying mutator "${mutator.id}": ${parsed.error.message}`);
    }
    return parsed.data as Record<string, unknown>;
  }
}));
