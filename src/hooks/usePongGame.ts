import { useMemo } from "react";
import { useGame } from "../hooks/useGame";
import { PongGame } from "../games/pong/PongGame";
import type { PongState, PongInput } from "../games/pong/types";

export const usePongGame = (mode: "local" | "ai" | "online" | null) => {
  return useGame<PongGame, PongState, PongInput>(
    mode ? PongGame : null,
    {},
    { mode }
  );
};
