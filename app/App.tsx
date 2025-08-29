import { useEffect, useState, useRef } from "react";
import { AsteroidsGame } from "../src/game/AsteroidsGame";
import { GameRenderer } from "@/components/GameRenderer";
import { GameControls } from "@/components/GameControls";
import { GameUI } from "@/components/GameUI";
import type { GameStateComponent } from "../src/types/GameTypes";

export default function App() {
  const [game, setGame] = useState<AsteroidsGame | null>(null);
  const [gameState, setGameState] = useState<GameStateComponent | null>(null);
  const gameRef = useRef<AsteroidsGame | null>(null);
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const newGame = new AsteroidsGame();
    setGame(newGame);
    gameRef.current = newGame;
    newGame.start();

    // Update UI periodically
    const uiUpdateInterval = setInterval(() => {
      if (gameRef.current) {
        setGameState(gameRef.current.getGameState());
        forceUpdate({}); // Force re-render for game entities
      }
    }, 16); // ~60 FPS

    return () => {
      clearInterval(uiUpdateInterval);
      newGame.stop();
    };
  }, []);

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
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center" />
    );
  }

  return (
    <div className="w-full h-screen bg-black flex flex-col items-center justify-center relative">
      <GameUI gameState={gameState} />
      <GameRenderer world={game.getWorld()} />
      <GameControls
        onThrust={(pressed) => handleInput("thrust", pressed)}
        onRotateLeft={(pressed) => handleInput("rotateLeft", pressed)}
        onRotateRight={(pressed) => handleInput("rotateRight", pressed)}
        onShoot={(pressed) => handleInput("shoot", pressed)}
      />
    </div>
  );
}
