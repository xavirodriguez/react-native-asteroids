import { useEffect, useState, useMemo } from "react";
import { useGame } from "@tiny-aster/react-native";
import { useHighScore } from "./useHighScore";
import { AsteroidsGame } from "@tiny-aster/core/games/asteroids";
import { INITIAL_GAME_STATE } from "../types/GameTypes";
import type { GameStateComponent, InputState } from "../types/GameTypes";
import { MutatorService } from "../services/MutatorService";

/**
 * Hook especializado para gestionar la instancia del juego Asteroids.
 *
 * @remarks
 * Actúa como puente (bridge) entre React y la clase `AsteroidsGame`. Encapsula
 * la lógica de inicialización de la escena, carga de assets específicos
 * y configuración del modo multijugador.
 */

export function useAsteroidsGame(isMultiplayer: boolean = false) {
  const [mutators, setMutators] = useState<any[] | null>(null);

  useEffect(() => {
    async function loadOptions() {
      const enabled = await MutatorService.isMutatorModeEnabled();
      const weekly = enabled ? MutatorService.getActiveMutatorsForGame("asteroids") : [];
      setMutators(weekly);
    }
    loadOptions();
  }, []);

  const memoizedGameOptions = useMemo(() => ({
    mutators: mutators || []
  }), [mutators]);

  const { game, gameState, isPaused, isReady, handleInput, togglePause, restart } =
    useGame<AsteroidsGame, GameStateComponent, InputState>(
      mutators !== null ? AsteroidsGame : null,
      isMultiplayer,
      {
        initialState: INITIAL_GAME_STATE,
        gameOptions: memoizedGameOptions
      }
    );

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
