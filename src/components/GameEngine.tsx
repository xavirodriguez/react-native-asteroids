import React, { useEffect, useState } from "react";
import { World } from "../engine/core/World";
import { GameLoop } from "../engine/core/GameLoop";

interface GameEngineProps {
  world: World;
  gameLoop: GameLoop;
  renderComponent: React.ComponentType<{ world: World; gameLoop: GameLoop }>;
}

/**
 * React wrapper for the AsterEngine.
 * Orchestrates the GameLoop and provides the world to the specified Renderer component.
 */
export const GameEngine: React.FC<GameEngineProps> = ({ world, gameLoop, renderComponent: Renderer }) => {
  useEffect(() => {
    gameLoop.start();

    return () => {
      gameLoop.stop();
    };
  }, [gameLoop]);

  return <Renderer world={world} gameLoop={gameLoop} />;
};
