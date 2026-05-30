/**
 * System for playback and management of recorded game sessions.
 *
 * This module allows loading historical input streams and replaying them
 * through the simulation engine. It is intended to support reproducible
 * behavior when the simulation is seeded identically and remains free of
 * unmanaged side effects.
 *
 * @packageDocumentation
 */

import { ReplayData, InputFrame } from "./NetTypes";
import { AsteroidsGame } from "../games/asteroids/AsteroidsGame";

/**
 * Manages the state and execution of a game replay.
 */
export class ReplayManager {
  private replayData: ReplayData | null = null;
  private currentFrameIndex: number = 0;
  private isPlaying: boolean = false;

  /**
   * Initializes the manager with a recorded replay dataset.
   */
  public loadReplay(data: ReplayData) {
    this.replayData = data;
    this.currentFrameIndex = 0;
    this.isPlaying = true;
  }

  public update(game: AsteroidsGame, deltaTime: number) {
    if (!this.isPlaying || !this.replayData) return;

    if (this.currentFrameIndex >= this.replayData.frames.length) {
      this.isPlaying = false;
      return;
    }

    const frame = this.replayData.frames[this.currentFrameIndex];

    // Process all recorded inputs for this tick
    Object.entries(frame.inputs).forEach(([sessionId, frames]) => {
      // Find the entity for this sessionId
      const ships = game.getWorld().query("Ship");
      const entity = ships.find(e => {
        const ship = game.getWorld().getComponent<import("../engine/core/CoreComponents").ShipComponent>(e, "Ship");
        return ship && ship.sessionId === sessionId;
      });

      if (entity !== undefined) {
        frames.forEach((inputFrame: InputFrame) => {
          // Replay should use side-effect free input application
          game.applyInputToEntity(entity, inputFrame);
        });
      }
    });

    game.runSimulationStep(deltaTime, false);

    this.currentFrameIndex++;
  }

  public stop() {
    this.isPlaying = false;
  }
}
