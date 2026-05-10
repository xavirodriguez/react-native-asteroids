import { useMemo, useState, useEffect } from "react";
import { useGame } from "../hooks/useGame";
import { PongGame } from "../games/pong/PongGame";
import { MutatorService } from "../services/MutatorService";
import type { Mutator } from "../config/MutatorConfig";
import type { PongState, PongInput } from "../games/pong/types";

export const usePongGame = (mode: "local" | "ai" | "online" | null) => {
  const [activeMutators, setActiveMutators] = useState<Mutator[]>([]);

  useEffect(() => {
    MutatorService.isMutatorModeEnabled().then(enabled => {
      if (enabled) {
        setActiveMutators(MutatorService.getActiveMutatorsForGame("pong"));
      }
    });
  }, []);

  const gameOptions = useMemo(() => ({
    mode,
    activeMutators
  }), [mode, activeMutators]);

  return useGame<PongGame, PongState, PongInput>(
    mode ? PongGame : null,
    {},
    gameOptions
  );
};
