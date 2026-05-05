/**
 * Service to interact with the global daily leaderboard.
 */
export class LeaderboardService {
  private static BASE_URL = process.env.EXPO_PUBLIC_SERVER_URL || "http://localhost:2567";

  /**
   * Submits a score for the daily leaderboard.
   */
  public static async submitDailyScore(
    gameId: string,
    dateKey: string,
    score: number,
    playerId: string,
    displayName: string,
    seed?: number
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.BASE_URL}/daily-score`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameId,
          dateKey,
          score,
          playerId,
          displayName,
          seed,
          clientVersion: "1.0.0"
        }),
      });
      return response.ok;
    } catch (e) {
      console.warn("Failed to submit score to leaderboard (offline?)", e);
      return false;
    }
  }

  /**
   * Fetches the top 20 scores for a given game and date.
   */
  public static async fetchDailyLeaderboard(
    gameId: string,
    dateKey: string
  ): Promise<unknown[]> {
    try {
      const response = await fetch(`${this.BASE_URL}/daily-leaderboard?gameId=${gameId}&dateKey=${dateKey}`);
      if (!response.ok) return [];
      return await response.json();
    } catch (e) {
      console.warn("Failed to fetch leaderboard (offline?)", e);
      return [];
    }
  }
}
