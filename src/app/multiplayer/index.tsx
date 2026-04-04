import { Platform } from "react-native";
import { GameScreen } from "@/src/components/GameScreen";
import { GameUI } from "@/src/components/GameUI";
import { GameControls } from "@/src/components/GameControls";
import { useMultiplayerGame } from "@/src/hooks/useMultiplayerGame";
import { AsteroidsGame } from "@/src/games/asteroids/AsteroidsGame";
import { INITIAL_GAME_STATE } from "@/src/types/GameTypes";

/**
 * Multiplayer Asteroids Game Route.
 */
export default function MultiplayerAsteroidsRoute() {
  const { gameState, handleInput, isPaused, togglePause, connected } = useMultiplayerGame(
    AsteroidsGame,
    INITIAL_GAME_STATE
  );

  const controlHandlers = {
    onThrust: (pressed: boolean) => handleInput({ thrust: pressed } as any),
    onRotateLeft: (pressed: boolean) => handleInput({ rotateLeft: pressed } as any),
    onRotateRight: (pressed: boolean) => handleInput({ rotateRight: pressed } as any),
    onShoot: (pressed: boolean) => handleInput({ shoot: pressed } as any),
    onHyperspace: (pressed: boolean) => handleInput({ hyperspace: pressed } as any),
  };

  if (!connected) {
    // Show a loading/connecting state
    return null;
  }

  return (
    <GameScreen
      title="MULTIPLAYER"
      highScore={0}
      instructions={Platform.OS === "web" ? "↑ Thrust  ←→ Rotate  Space Shoot" : "Touch controls"}
      game={null} // Game instance is on server
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
