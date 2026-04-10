import { System } from "../core/System";
import { World } from "../core/World";
import { BaseGame } from "../core/BaseGame";

/**
 * Interfaz para componentes que representan un estado de juego genérico.
 */
export interface IGameState {
  isGameOver: boolean;
  gameOverLogged?: boolean;
}

/**
 * Sistema base abstracto para gestionar el estado global del juego.
 * Estandariza cómo se detecta, registra y comunica la condición de "Game Over".
 *
 * @template TState - El tipo del componente de estado de juego (debe implementar IGameState).
 *
 * @responsibility Monitorizar condiciones de victoria/derrota.
 * @responsibility Pausar la instancia del juego cuando el estado de Game Over es detectado.
 * @executionOrder Fase: GameRules.
 *
 * @conceptualRisk [SINGLETON_STATE][MEDIUM] Si existen múltiples entidades con componentes
 * de estado, el sistema solo procesará la primera retornada por `getGameState`.
 */
export abstract class BaseGameStateSystem<TState extends IGameState> extends System {
  protected gameOverLogged = false;
  protected gameInstance: BaseGame<any, any> | undefined;
  protected _world: World | undefined;

  constructor(gameInstance?: BaseGame<any, any>) {
    super();
    this.gameInstance = gameInstance;
  }

  /**
   * Actualiza el estado del juego comprobando la condición de fin de partida.
   *
   * @param world - El mundo ECS.
   * @param deltaTime - Tiempo transcurrido en milisegundos.
   */
  public update(world: World, deltaTime: number): void {
    this._world = world;
    const state = this.getGameState(world);
    if (!state) return;

    this.updateGameState(world, state, deltaTime);
    this.handleGameOverStatus(state);
  }

  /**
   * Implementar la lógica específica del juego para actualizar las propiedades del estado.
   */
  protected abstract updateGameState(world: World, state: TState, deltaTime: number): void;

  /**
   * Recupera el componente de estado de juego desde el mundo ECS.
   */
  protected abstract getGameState(world: World): TState | undefined;

  /**
   * Evalúa si se cumplen las condiciones para finalizar la partida.
   */
  protected abstract evaluateGameOverCondition(state: TState): boolean;

  /**
   * Gestiona la transición al estado de Game Over, incluyendo el log y la pausa del motor.
   */
  private handleGameOverStatus(state: TState): void {
    const isGameOver = this.evaluateGameOverCondition(state);
    state.isGameOver = isGameOver;

    if (isGameOver) {
      if (state.gameOverLogged !== true) {
        state.gameOverLogged = true;
        this.gameInstance?.pause();
      }
    } else {
      state.gameOverLogged = false;
    }
  }

  /**
   * Comprueba si la partida ha finalizado.
   */
  public isGameOver(world?: World): boolean {
    const w = world || this._world;
    if (w) {
        const state = this.getGameState(w);
        return state?.gameOverLogged || false;
    }
    return false;
  }

  /**
   * Reinicia los flags de Game Over en el estado y en la instancia del sistema.
   */
  public resetGameOverState(world?: World): void {
    const w = world || this._world;
    if (w) {
        const state = this.getGameState(w);
        if (state) {
            state.gameOverLogged = false;
            state.isGameOver = false;
        }
    }
  }
}
