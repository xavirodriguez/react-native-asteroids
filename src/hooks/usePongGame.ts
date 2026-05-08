import { useMemo } from "react";
import { useGame } from "../hooks/useGame";
import { PongGame } from "../games/pong/PongGame";
import type { PongState, PongInput } from "../games/pong/types";

export const usePongGame = (mode: "local" | "ai" | "online", seed?: number) => {
  const options = useMemo(() => ({
    gameOptions: { mode, seed }
  }), [mode, seed]);

  return useGame<PongGame, PongState, PongInput>(PongGame, null, false, options);
};
