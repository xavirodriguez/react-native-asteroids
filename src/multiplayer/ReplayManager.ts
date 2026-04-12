import { ReplayData, InputFrame } from "./NetTypes";
import { AsteroidsGame } from "../games/asteroids/AsteroidsGame";

export class ReplayManager {
  private replayData: ReplayData | null = null;
  private currentFrameIndex: number = 0;
  private isPlaying: boolean = false;

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
    Object.entries(frame.inputs).forEach(([_sessionId, frames]) => {
        frames.forEach((inputFrame: InputFrame) => {
            // We use predictLocalPlayer because it's the logic that applies inputs
            // to a specific ship. We need to tell the game which ship to apply it to.
            // For replay purposes, we can assume the game already has ships created
            // from the initial state of the replay.
            game.predictLocalPlayer(inputFrame, deltaTime);
        });
    });

    this.currentFrameIndex++;
  }

  public stop() {
    this.isPlaying = false;
  }
}
