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
  private readonly MAX_FRAMES = 3600 * 5; // 5 minutes at 60fps
  private isRecording: boolean = false;
  private currentTick: number = 0;

  public startRecording(): void {
    this.frames = [];
    this.head = 0;
    this.isRecording = true;
    this.currentTick = 0;
  }

  public stopRecording(): ReplayData {
    this.isRecording = false;

    let orderedFrames: ReplayFrame[];
    if (this.frames.length < this.MAX_FRAMES) {
      orderedFrames = [...this.frames];
    } else {
      orderedFrames = [
        ...this.frames.slice(this.head),
        ...this.frames.slice(0, this.head)
      ];
    }

    const startTick = orderedFrames.length > 0 ? orderedFrames[0].tick : 0;
    return {
      version: 1,
      roomId: "recorded-session",
      startTick,
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

    const frame = {
      tick,
      inputs,
      events: [] // Events could be recorded here too
    };

    // Performance-optimized circular buffer to avoid O(N) shift()
    if (this.frames.length < this.MAX_FRAMES) {
      this.frames.push(frame);
    } else {
      this.frames[this.head] = frame;
      this.head = (this.head + 1) % this.MAX_FRAMES;
    }

    this.currentTick = tick;
  }
}
