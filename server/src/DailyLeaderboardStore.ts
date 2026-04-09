import fs from "fs";
import path from "path";

interface LeaderboardEntry {
  playerId: string;
  score: number;
}

/**
 * Server-side store for daily leaderboards.
 * Persists to JSON files to survive restarts.
 */
export class DailyLeaderboardStore {
  private static STORAGE_DIR = path.join(process.cwd(), "data", "leaderboards");
  private cache: Map<string, LeaderboardEntry[]> = new Map();

  constructor() {
    if (!fs.existsSync(DailyLeaderboardStore.STORAGE_DIR)) {
      fs.mkdirSync(DailyLeaderboardStore.STORAGE_DIR, { recursive: true });
    }
  }

  private getKey(gameId: string, dateKey: string): string {
    // Sanitize keys to prevent path traversal
    const safeGameId = gameId.replace(/[^a-z0-9_-]/gi, "_");
    const safeDateKey = dateKey.replace(/[^0-9]/g, "");
    return `${safeGameId}_${safeDateKey}`;
  }

  public addScore(gameId: string, dateKey: string, playerId: string, score: number) {
    const key = this.getKey(gameId, dateKey);
    let entries = this.getEntries(gameId, dateKey);

    const existingIndex = entries.findIndex(e => e.playerId === playerId);
    if (existingIndex !== -1) {
      if (score > entries[existingIndex].score) {
        entries[existingIndex].score = score;
      }
    } else {
      entries.push({ playerId, score });
    }

    // Sort by score descending
    entries.sort((a, b) => b.score - a.score);
    // Keep top 100
    entries = entries.slice(0, 100);

    this.cache.set(key, entries);
    this.flush(key, entries);
  }

  public getEntries(gameId: string, dateKey: string): LeaderboardEntry[] {
    const key = this.getKey(gameId, dateKey);
    if (this.cache.has(key)) {
      return [...this.cache.get(key)!];
    }

    const filePath = path.join(DailyLeaderboardStore.STORAGE_DIR, `${key}.json`);
    if (fs.existsSync(filePath)) {
      try {
        const data = fs.readFileSync(filePath, "utf-8");
        const entries = JSON.parse(data);
        this.cache.set(key, entries);
        return [...entries];
      } catch (e) {
        console.error("Error reading leaderboard file", e);
      }
    }

    return [];
  }

  private flush(key: string, entries: LeaderboardEntry[]) {
    const filePath = path.join(DailyLeaderboardStore.STORAGE_DIR, `${key}.json`);
    try {
      fs.writeFileSync(filePath, JSON.stringify(entries));
    } catch (e) {
      console.error("Error writing leaderboard file", e);
    }
  }
}
