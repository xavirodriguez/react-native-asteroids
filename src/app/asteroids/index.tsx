import { Platform } from "react-native";
import { GameScreen } from "@/src/components/GameScreen";
import { GameUI } from "@/src/components/GameUI";
import { GameControls } from "@/src/components/GameControls";
import { useAsteroidsGame } from "@/src/hooks/useAsteroidsGame";

/**
 * Asteroids Game Route.
 * Thin wrapper around the generic GameScreen component.
 */
export default function AsteroidsRoute() {
  const { game, gameState, handleInput, isPaused, togglePause, highScore } = useAsteroidsGame();

  const controlHandlers = {
    onThrust: (pressed: boolean) => handleInput({ thrust: pressed }),
    onRotateLeft: (pressed: boolean) => handleInput({ rotateLeft: pressed }),
    onRotateRight: (pressed: boolean) => handleInput({ rotateRight: pressed }),
    onShoot: (pressed: boolean) => handleInput({ shoot: pressed }),
    onHyperspace: (pressed: boolean) => handleInput({ hyperspace: pressed }),
  };

  return (
    <GameScreen
      title="ASTEROIDES"
      highScore={highScore}
      instructions={Platform.OS === "web" ? "↑ Empujar  ←→ Rotar  Espacio Disparar  Shift Hiperspacio" : "Controles táctiles"}
      game={game}
      gameState={gameState}
      isPaused={isPaused}
      togglePause={togglePause}
      uiComponent={GameUI}
      controlsComponent={GameControls}
      handleInput={handleInput}
      controlHandlers={controlHandlers}
    />
  );
}
