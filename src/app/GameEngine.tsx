import React, { useEffect, useRef, useState } from "react";
import { World } from "../engine/core/World";
import { GameLoop } from "../engine/core/GameLoop";
import { SvgRenderer } from "../engine/rendering/SvgRenderer";

interface GameEngineProps {
  world: World;
  gameLoop: GameLoop;
}

/**
 * React wrapper for the AsterEngine.
 */
export const GameEngine: React.FC<GameEngineProps> = ({ world, gameLoop }) => {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = gameLoop.subscribe(() => {
      // Trigger a light React update if needed for components that depend on world state directly.
      // However, SvgRenderer should handle most of it through world.version.
      setVersion(v => v + 1);
    });

    gameLoop.start();

    return () => {
      gameLoop.stop();
      unsubscribe();
    };
  }, [gameLoop]);

  return <SvgRenderer world={world} />;
};
