import { ReplayData, ReplayFrame, InputFrame } from "../../multiplayer/NetTypes";

/**
 * Grabador de sesiones de juego para propósitos de replay y depuración.
 *
 * @remarks
 * Diseñado para capturar las entradas del usuario frame a frame para facilitar la posible recreación
 * de una partida. La fidelidad está sujeta al determinismo de la simulación,
 * la captura del estado inicial y las limitaciones del hardware.
 *
 * @responsibility Almacenar la secuencia de inputs asociados a cada tick.
 * @responsibility Generar un objeto `ReplayData` compatible con el sistema de transporte.
 *
 * @conceptualRisk [MEMORY_LEAK][HIGH] La grabación continua sin límites puede
 * agotar la memoria disponible en sesiones largas. El buffer interno está limitado a
 * `MAX_FRAMES` para ayudar a mitigar esto.
 * @conceptualRisk [DETERMINISM][MEDIUM] Si el estado inicial del mundo (semilla y snapshots
 * iniciales) no se captura junto con los inputs, el replay puede divergir
 * de la sesión original.
 */
export class ReplayRecorder {
  private frames: ReplayFrame[] = [];
  private head: number = 0;
  private count: number = 0;
  private readonly MAX_FRAMES = 1800; // 60 seconds @ 30 FPS or ~30s @ 60 FPS
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

    // Reconstruct frames in chronological order from the circular buffer
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

  /**
   * Registra los inputs recibidos en un tick específico.
   *
   * @param tick - Número de tick de la simulación.
   * @param inputs - Diccionario de inputs mapeados por ID de jugador/entidad.
   *
   * @remarks
   * La grabación debe estar activa (`isRecording === true`) para que esto tenga efecto.
   */
  public recordTick(tick: number, inputs: Record<string, InputFrame[]>): void {
    if (!this.isRecording || !this.isEnabled()) return;

    this.currentTick = tick;

    // Approximately O(1) insertion in circular buffer
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
    // Only enable in development or if debug flag is set
    try {
        return (__DEV__ || (globalThis as unknown as { DEBUG_REPLAY: boolean }).DEBUG_REPLAY === true);
    } catch {
        return false;
    }
  }
}
