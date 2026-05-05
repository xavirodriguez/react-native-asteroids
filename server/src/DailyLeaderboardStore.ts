import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

interface LeaderboardEntry {
  playerId: string;
  displayName: string;
  score: number;
}

/**
 * Server-side store for daily leaderboards using SQLite.
 */
export class DailyLeaderboardStore {
  private db: Database.Database;

  constructor() {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.db = new Database(path.join(dataDir, "leaderboards.db"));
    this.init();
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS scores (
        gameId TEXT,
        dateKey TEXT,
        playerId TEXT,
        displayName TEXT,
        score INTEGER,
        PRIMARY KEY (gameId, dateKey, playerId)
      )
    `);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_scores_lookup ON scores (gameId, dateKey, score DESC)`);
  }

  public addScore(gameId: string, dateKey: string, playerId: string, score: number, displayName: string = "Jugador") {
    const stmt = this.db.prepare(`
      INSERT INTO scores (gameId, dateKey, playerId, displayName, score)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(gameId, dateKey, playerId) DO UPDATE SET
        score = MAX(excluded.score, scores.score),
        displayName = excluded.displayName
    `);
    stmt.run(gameId, dateKey, playerId, displayName, score);
  }

  public getEntries(gameId: string, dateKey: string): LeaderboardEntry[] {
    const stmt = this.db.prepare(`
      SELECT playerId, displayName, score
      FROM scores
      WHERE gameId = ? AND dateKey = ?
      ORDER BY score DESC
      LIMIT 100
    `);
    return stmt.all(gameId, dateKey) as LeaderboardEntry[];
  }
}
