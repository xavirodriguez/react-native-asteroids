import { ReplayData, InputFrame } from "../../multiplayer/NetTypes";
/**
 * Grabador de sesiones de juego para propósitos de replay y depuración.
 *
 * @remarks
 * Captura las entradas del usuario frame a frame para permitir la recreación
 * determinista de una partida.
 *
 * @responsibility Almacenar la secuencia de inputs asociados a cada tick.
 * @responsibility Generar un objeto `ReplayData` compatible con el sistema de transporte.
 *
 * @conceptualRisk [MEMORY_LEAK][HIGH] La grabación continua sin límites puede
 * agotar la memoria disponible en sesiones largas.
 * @conceptualRisk [DETERMINISM][MEDIUM] Si el estado inicial del mundo no se captura
 * junto con los inputs, el replay no será fiel.
 */
export declare class ReplayRecorder {
    private frames;
    private isRecording;
    private currentTick;
    startRecording(): void;
    stopRecording(): ReplayData;
    /**
     * Registra los inputs recibidos en un tick específico.
     *
     * @param tick - El número de tick de la simulación.
     * @param inputs - Diccionario de inputs mapeados por ID de jugador/entidad.
     *
     * @precondition La grabación debe estar activa (`isRecording === true`).
     * @postcondition Se añade un nuevo frame a la colección interna.
     */
    recordTick(tick: number, inputs: Record<string, InputFrame[]>): void;
}
