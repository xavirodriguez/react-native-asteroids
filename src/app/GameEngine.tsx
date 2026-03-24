import React, { useEffect, useState } from "react";
import { World } from "../engine/core/World";
import { GameLoop } from "../engine/core/GameLoop";

interface GameEngineProps {
  world: World;
  gameLoop: GameLoop;
  renderComponent: React.ComponentType<{ world: World }>;
}

/**
 * React wrapper for the AsterEngine.
 * Orchestrates the GameLoop and provides the world to the specified Renderer component.
 */
export const GameEngine: React.FC<GameEngineProps> = ({ world, gameLoop, renderComponent: Renderer }) => {
  const [, setVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = gameLoop.subscribeRender(() => {
      // Trigger a React update for every frame if necessary.
      // Renderer components often depend on world.version which is updated in systems.
      setVersion(v => v + 1);
    });

    gameLoop.start();

    return () => {
      gameLoop.stop();
      unsubscribe();
    };
  }, [gameLoop]);

  return <Renderer world={world} />;
};
