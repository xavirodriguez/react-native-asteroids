import { Platform } from "react-native";
import { GameScreen } from "@/src/components/GameScreen";
import { SpaceInvadersUI } from "@/src/components/SpaceInvadersUI";
import { SpaceInvadersControls } from "@/src/components/SpaceInvadersControls";
import { useSpaceInvadersGame } from "@/src/hooks/useSpaceInvadersGame";

/**
 * Space Invaders Game Route.
 * Thin wrapper around the generic GameScreen component.
 */
export default function SpaceInvadersRoute() {
  const { game, gameState, handleInput, isPaused, togglePause, highScore } = useSpaceInvadersGame();

  const controlHandlers = {
    onMoveLeft: (pressed: boolean) => handleInput({ moveLeft: pressed }),
    onMoveRight: (pressed: boolean) => handleInput({ moveRight: pressed }),
    onShoot: (pressed: boolean) => handleInput({ shoot: pressed }),
  };

  return (
    <GameScreen
      title="SPACE INVADERS"
      highScore={highScore}
      instructions={Platform.OS === "web" ? "←→ Mover  Espacio Disparar" : "Controles táctiles"}
      game={game}
      gameState={gameState}
      isPaused={isPaused}
      togglePause={togglePause}
      uiComponent={SpaceInvadersUI}
      controlsComponent={SpaceInvadersControls}
      handleInput={handleInput}
      controlHandlers={controlHandlers}
    />
  );
}
