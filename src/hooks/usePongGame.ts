import { useMemo } from "react";
import { useGame } from "../hooks/useGame";
import { PongGame } from "../games/pong/PongGame";
import type { PongState, PongInput } from "../games/pong/types";

export const usePongGame = (mode: "local" | "ai" | "online" | null) => {
  const config = useMemo(
    () => ({
      isMultiplayer: mode === "online",
      gameOptions: { mode },
    }),
    [mode]
  );

  return useGame<PongGame, PongState, PongInput>(
    mode ? PongGame : null,
    config
  );
};
