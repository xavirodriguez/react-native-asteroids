import { Platform } from "react-native";
import { GameScreen } from "@/src/components/GameScreen";
import { FlappyBirdUI } from "@/src/components/FlappyBirdUI";
import { FlappyBirdControls } from "@/src/components/FlappyBirdControls";
import { useFlappyBirdGame } from "@/src/hooks/useFlappyBirdGame";

/**
 * Flappy Bird Game Route.
 * Thin wrapper around the generic GameScreen component.
 */
export default function FlappyBirdRoute() {
  const { game, gameState, handleInput, isPaused, togglePause, highScore } = useFlappyBirdGame();

  const controlHandlers = {
    onFlap: (pressed: boolean) => handleInput({ flap: pressed }),
  };

  return (
    <GameScreen
      title="FLAPPY BIRD"
      highScore={highScore}
      instructions={Platform.OS === "web" ? "Espacio saltar" : "Tocar pantalla para saltar"}
      game={game}
      gameState={gameState}
      isPaused={isPaused}
      togglePause={togglePause}
      uiComponent={FlappyBirdUI}
      controlsComponent={FlappyBirdControls}
      handleInput={handleInput}
      controlHandlers={controlHandlers}
    />
  );
}
