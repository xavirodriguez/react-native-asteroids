import React, { useEffect, useMemo, useState } from "react";
import { World } from "../engine/core/World";
import { GameLoop } from "../engine/core/GameLoop";
import { SkiaRenderer } from "../engine/rendering/SkiaRenderer";
import { RenderBridge } from "../engine/rendering/RenderBridge";

interface GameEngineProps {
  world: World;
  gameLoop: GameLoop;
}

const renderBridge = new RenderBridge();

/**
 * React wrapper for the AsterEngine.
 */
export const GameEngine: React.FC<GameEngineProps> = ({ world, gameLoop }) => {
  const [, setVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = gameLoop.subscribeRender(() => {
      setVersion(v => v + 1);
    });

    gameLoop.start();

    return () => {
      gameLoop.stop();
      unsubscribe();
    };
  }, [gameLoop]);

  const frame = useMemo(() => renderBridge.extractFrame(world), [world.version]);

  return <SkiaRenderer frame={frame} />;
};
