import { useGame } from "../hooks/useGame";
import { PongGame } from "../games/pong/PongGame";
import type { PongState, PongInput } from "../games/pong/types";

export const usePongGame = () =>
  useGame<PongGame, PongState, PongInput>(PongGame, null);
