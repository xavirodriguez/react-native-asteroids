import { ReplayData, ReplayFrame, InputFrame } from "../../multiplayer/NetTypes";

/**
 * Grabador de sesiones de juego para propósitos de replay y depuración.
 *
 * @remarks
 * Captura las entradas del usuario frame a frame para facilitar la recreación
 * orientada al determinismo de una partida.
 *
 * @responsibility Almacenar la secuencia de inputs asociados a cada tick.
 * @responsibility Generar un objeto `ReplayData` compatible con el sistema de transporte.
 *
 * @conceptualRisk [MEMORY_LEAK][HIGH] La grabación continua sin límites puede
 * agotar la memoria disponible en sesiones largas.
 * @conceptualRisk [DETERMINISM][MEDIUM] Si el estado inicial del mundo no se captura
 * junto con los inputs, el replay no será fiel.
 */
export class ReplayRecorder {
  private frames: ReplayFrame[] = [];
  private head: number = 0;
  private count: number = 0;
  private readonly MAX_FRAMES = 3600 * 5; // 18,000 frames (5 minutes at 60fps)
  private isRecording: boolean = false;
  private currentTick: number = 0;
  private readonly MAX_FRAMES = 10000;

  public startRecording(): void {
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
      startTick: firstTick,
      endTick: this.currentTick,
      frames: orderedFrames
    };
  }

  /**
   * Registra los inputs recibidos en un tick específico.
   *
   * @param tick - El número de tick de la simulación.
   * @param inputs - Diccionario de inputs mapeados por ID de jugador/entidad.
   *
   * @precondition La grabación debería estar activa (`isRecording === true`).
   * @postcondition Se añade un nuevo frame a la colección interna.
   */
  public recordTick(tick: number, inputs: Record<string, InputFrame[]>): void {
    if (!this.isRecording) return;

    // O(1) insertion in circular buffer
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
}
