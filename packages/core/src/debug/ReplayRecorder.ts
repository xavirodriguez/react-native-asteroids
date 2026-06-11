import { ReplayData, ReplayFrame, InputFrame } from "../network/NetTypes";

const __DEV__ = typeof process !== "undefined" && process.env.NODE_ENV !== "production";

/**
 * Grabador de sesiones de juego para propósitos de replay y depuración.
 */
export class ReplayRecorder {
  private frames: ReplayFrame[] = [];
  private head: number = 0;
  private count: number = 0;
  private readonly MAX_FRAMES = 1800;
  private isRecording: boolean = false;
  private currentTick: number = 0;

  public startRecording(): void {
    if (!this.isEnabled()) return;
    this.frames = new Array(this.MAX_FRAMES);
    this.head = 0;
    this.count = 0;
    this.isRecording = true;
    this.currentTick = 0;
  }

  public stopRecording(): ReplayData {
    this.isRecording = false;

    const orderedFrames: ReplayFrame[] = new Array(this.count);
    if (this.count < this.MAX_FRAMES) {
      for (let i = 0; i < this.count; i++) {
        orderedFrames[i] = this.frames[i];
      }
    } else {
      for (let i = 0; i < this.MAX_FRAMES; i++) {
        orderedFrames[i] = this.frames[(this.head + i) % this.MAX_FRAMES];
      }
    }

    const startTick = orderedFrames.length > 0 ? orderedFrames[0].tick : 0;
    return {
      version: 1,
      roomId: "recorded-session",
      startTick: startTick,
      endTick: this.currentTick,
      frames: orderedFrames
    };
  }

  public recordTick(tick: number, inputs: Record<string, InputFrame[]>): void {
    if (!this.isRecording || !this.isEnabled()) return;

    this.currentTick = tick;

    this.frames[this.head] = {
      tick,
      inputs,
      events: []
    };

    this.head = (this.head + 1) % this.MAX_FRAMES;
    if (this.count < this.MAX_FRAMES) {
      this.count++;
    }
  }

  private isEnabled(): boolean {
    try {
        return (__DEV__ || (globalThis as any).DEBUG_REPLAY === true);
    } catch {
        return false;
    }
  }
}
