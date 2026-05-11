import { useMemo } from "react";
import { useGame } from "../hooks/useGame";
import { PongGame } from "../games/pong/PongGame";
import type { PongState, PongInput } from "../games/pong/types";

export const usePongGame = (mode: "local" | "ai" | "online" | null, seed?: number) => {
  const gameOptions = useMemo(
    () => ({ mode }),
    [mode]
  );

  return useGame<PongGame, PongState, PongInput>(
    mode ? PongGame : null,
    mode === "online",
    { gameOptions, seed }
  );
};
