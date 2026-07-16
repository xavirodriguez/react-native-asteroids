import { z } from "zod";

/**
 * Represents a single tick of validated user input.
 */
export const InputFrameSchema = z.object({
  /** Network protocol version. */
  protocolVersion: z.number().optional(),
  /** The simulation tick this input belongs to. */
  tick: z.number().int().nonnegative(),
  /** Wall-clock time when the input was captured. */
  timestamp: z.number().optional(),
  /** List of semantic actions active (e.g., "shoot", "thrust"). */
  actions: z.array(z.string()),
  /** Continuous input values (e.g., joystick coordinates). */
  axes: z.record(z.string(), z.number())
});

export type InputFrame = z.infer<typeof InputFrameSchema>;

/**
 * Historical state of an entity used for reconciliation.
 */
export interface PredictedState {
  /** The simulation tick for this state. */
  tick: number;
  /** Unique identifier of the entity. */
  entityId: string;
  /** Physical state at this tick. */
  state: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    angle?: number;
  };
  /** List of entity IDs active at this tick. */
  entities: string[];
}

/**
 * Captured visual state for interpolation.
 */
export interface EntitySnapshot {
  /** The server or simulation tick this snapshot represents. */
  tick: number;
  /** World X position. */
  x: number;
  /** World Y position. */
  y: number;
  /** Rotation in radians. */
  angle?: number;
  /** Wall-clock time when the state was received or captured. */
  timestamp: number;
}

export interface ReplayFrame {
  tick: number;
  inputs: Record<string, InputFrame[]>;
  events: string[];
}

export interface ReplayData {
  version: number;
  roomId: string;
  startTick: number;
  endTick: number;
  frames: ReplayFrame[];
}
