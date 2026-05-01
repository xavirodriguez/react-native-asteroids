/**
 * Network protocol and synchronization data structures.
 *
 * This module defines the common interfaces used for authoritative server updates,
 * client-side prediction, and visual interpolation.
 *
 * @packageDocumentation
 */

/**
 * Represents a single tick of user input.
 */
export interface InputFrame {
  /** The simulation tick this input belongs to. */
  tick: number;
  /** Wall-clock time when the input was captured. */
  timestamp: number;
  /** List of semantic actions active (e.g., "shoot", "thrust"). */
  actions: string[];
  /** Continuous input values (e.g., joystick coordinates). */
  axes: Record<string, number>;
}

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
