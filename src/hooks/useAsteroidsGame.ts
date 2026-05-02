import { useEffect } from "react";
import { useGame } from "./useGame";
import { useHighScore } from "./useHighScore";
import { AsteroidsGame } from "../games/asteroids/AsteroidsGame";
import { INITIAL_GAME_STATE } from "../types/GameTypes";
import type { GameStateComponent, InputState } from "../types/GameTypes";

/**
 * Hook especializado para gestionar la instancia del juego Asteroids.
 *
 * @remarks
 * Actúa como puente (bridge) entre React y la clase `AsteroidsGame`. Encapsula
 * la lógica de inicialización de la escena, carga de assets específicos
 * y configuración del modo multijugador.
 */
export function useAsteroidsGame(isMultiplayer: boolean = false) {
  const { game, gameState, isPaused, isReady, handleInput, togglePause, restart } =
    useGame<AsteroidsGame, GameStateComponent, InputState>(AsteroidsGame, INITIAL_GAME_STATE, isMultiplayer);

  const { highScore, updateHighScore } = useHighScore();

  // Update high score when game is over
  useEffect(() => {
    if (gameState?.isGameOver) {
      updateHighScore(gameState.score);
    }
  }, [gameState?.isGameOver, gameState?.score, updateHighScore]);

  return {
    game,
    gameState: gameState ?? INITIAL_GAME_STATE,
    handleInput,
    isPaused,
    isReady,
    togglePause,
    highScore,
    seed: game?.getSeed(),
    restartWithSeed: restart
  };
}
