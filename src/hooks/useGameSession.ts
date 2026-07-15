import { useEffect, useRef, useState } from "react";
import { PlayerProfileService } from "../services/PlayerProfileService";
import { DailyChallengeService } from "../services/DailyChallengeService";
import { LeaderboardService } from "../services/LeaderboardService";
import type { PlayerProfile } from "../services/PlayerProfileService";

export interface BaseGameState {
  isGameOver: boolean;
  score?: number;
  scoreP1?: number;
  scoreP2?: number;
}

export interface UseGameSessionOptions {
  gameId: string;
  isDaily: boolean;
  seed?: number;
  gameState: BaseGameState;
  customStats?: Partial<PlayerProfile["stats"]>;
}

/**
 * Custom hook to centralize post-game progression and daily challenge lifecycle logic.
 * Ensures that XP, daily attempts, and leaderboards are updated reliably and exactly once per session.
 */
export function useGameSession({
  gameId,
  isDaily,
  seed,
  gameState,
  customStats,
}: UseGameSessionOptions) {
  const [showDailyResults, setShowDailyResults] = useState(false);
  const sessionCompletedRef = useRef(false);

  useEffect(() => {
    if (gameState.isGameOver && !sessionCompletedRef.current) {
      sessionCompletedRef.current = true;

      const finalScore =
        gameState.score ??
        Math.max(gameState.scoreP1 ?? 0, gameState.scoreP2 ?? 0);

      const processProgression = async () => {
        try {
          // 1. Process base progression XP (score * 10)
          if (finalScore > 0) {
            await PlayerProfileService.addXP(finalScore * 10);
          }

          // 2. Update custom stats if provided
          if (customStats) {
            await PlayerProfileService.updateStats(gameId, customStats);
          }

          // 3. Process Daily Challenge and Leaderboard submissions
          if (isDaily && seed !== undefined) {
            await DailyChallengeService.markAttemptAsUsed(
              gameId,
              finalScore,
              seed,
              0
            );

            const profile = await PlayerProfileService.getProfile();
            await LeaderboardService.submitDailyScore(
              gameId,
              DailyChallengeService.getDateKey(),
              finalScore,
              profile.playerId,
              profile.displayName,
              seed
            );

            setShowDailyResults(true);
          }
        } catch (error) {
          console.error("Error processing game session progression:", error);
        }
      };

      processProgression();
    }

    if (!gameState.isGameOver) {
      sessionCompletedRef.current = false;
    }
  }, [
    gameState.isGameOver,
    gameState.score,
    gameState.scoreP1,
    gameState.scoreP2,
    isDaily,
    seed,
    gameId,
    customStats,
  ]);

  return {
    showDailyResults,
    setShowDailyResults,
  };
}
