import { ReplayData, ReplayFrame, InputFrame } from "../../multiplayer/NetTypes";
import { World } from "../core/World";

/**
 * Records input frames for replay purposes.
 */
export class ReplayRecorder {
  private frames: ReplayFrame[] = [];
  private isRecording: boolean = false;
  private currentTick: number = 0;

  public startRecording(): void {
    this.frames = [];
    this.isRecording = true;
    this.currentTick = 0;
  }

  public stopRecording(): ReplayData {
    this.isRecording = false;
    return {
      version: 1,
      roomId: "recorded-session",
      startTick: 0,
      endTick: this.currentTick,
      frames: [...this.frames]
    };
  }

  public recordTick(tick: number, inputs: Record<string, InputFrame[]>): void {
    if (!this.isRecording) return;

    this.currentTick = tick;
    this.frames.push({
      tick,
      inputs,
      events: [] // Events could be recorded here too
    });
  }
}
