import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { AsteroidsGame } from "../src/game/AsteroidsGame";
import { GameRenderer } from "@/components/GameRenderer";
import { GameControls } from "@/components/GameControls";
import { GameUI } from "@/components/GameUI";
import type { GameStateComponent } from "../src/types/GameTypes";

/**
 * Main application component that integrates the game engine with the React UI.
 *
 * @returns The rendered application.
 *
 * @remarks
 * This component manages the lifecycle of the {@link AsteroidsGame} instance
 * and subscribes to game updates to synchronize the React state efficiently.
 */
export default function App() {
  const [game, setGame] = useState<AsteroidsGame | null>(null);
  const [gameState, setGameState] = useState<GameStateComponent | null>(null);
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const newGame = new AsteroidsGame();
    setGame(newGame);
    newGame.start();

    // Subscribe to game updates instead of using a 16ms interval polling
    const unsubscribe = newGame.subscribe((updatedGame) => {
      setGameState(updatedGame.getGameState());
      forceUpdate({}); // Trigger re-render for game entities
    });

    return () => {
      unsubscribe();
      newGame.stop();
    };
  }, []);

  /**
   * Handles input changes from the controls UI.
   *
   * @param type - The type of input action.
   * @param pressed - Whether the action is active.
   */
  const handleInput = (
    type: "thrust" | "rotateLeft" | "rotateRight" | "shoot",
    pressed: boolean
  ) => {
    if (!game) return;

    const currentInputs = {
      thrust: false,
      rotateLeft: false,
      rotateRight: false,
      shoot: false,
    };

    currentInputs[type] = pressed;
    game.setInput(
      currentInputs.thrust,
      currentInputs.rotateLeft,
      currentInputs.rotateRight,
      currentInputs.shoot
    );
  };

  if (!game) {
    return <View />;
  }

  return (
    <View style={styles.container}>
      <GameUI gameState={gameState} />
      <GameRenderer world={game.getWorld()} />
      <GameControls
        onThrust={(pressed) => handleInput("thrust", pressed)}
        onRotateLeft={(pressed) => handleInput("rotateLeft", pressed)}
        onRotateRight={(pressed) => handleInput("rotateRight", pressed)}
        onShoot={(pressed) => handleInput("shoot", pressed)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
});
