import { StyleSheet, View } from "react-native";
import { GameRenderer } from "@/components/GameRenderer";
import { GameControls } from "@/components/GameControls";
import { GameUI } from "@/components/GameUI";
import { useAsteroidsGame } from "../src/hooks/useAsteroidsGame";

/**
 * Main application component that integrates the game engine with the React UI.
 */
export default function App() {
  const { game, gameState, handleInput } = useAsteroidsGame();

  if (!game) {
    return <View />;
  }

  return (
    <View style={styles.container}>
      <GameUI gameState={gameState} onRestart={() => game.restart()} />
      <GameRenderer world={game.getWorld()} />
      <GameControls
        onThrust={(pressed) => handleInput({ thrust: pressed })}
        onRotateLeft={(pressed) => handleInput({ rotateLeft: pressed })}
        onRotateRight={(pressed) => handleInput({ rotateRight: pressed })}
        onShoot={(pressed) => handleInput({ shoot: pressed })}
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
