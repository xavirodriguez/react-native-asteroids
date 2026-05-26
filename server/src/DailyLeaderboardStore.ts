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
        verified INTEGER DEFAULT 0,
        PRIMARY KEY (gameId, dateKey, playerId)
      )
    `);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_scores_lookup ON scores (gameId, dateKey, score DESC)`);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        playerId TEXT PRIMARY KEY,
        lastSubmission INTEGER NOT NULL
      )
    `);
  }

  public addScore(gameId: string, dateKey: string, playerId: string, score: number, displayName: string = "Jugador", verified: boolean = false) {
    const verifiedInt = verified ? 1 : 0;
    const stmt = this.db.prepare(`
      INSERT INTO scores (gameId, dateKey, playerId, displayName, score, verified)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(gameId, dateKey, playerId) DO UPDATE SET
        score = CASE
          WHEN excluded.verified = 1 AND scores.verified = 1 THEN MAX(excluded.score, scores.score)
          WHEN excluded.verified = 1 THEN excluded.score
          WHEN scores.verified = 1 THEN scores.score
          ELSE MAX(excluded.score, scores.score)
        END,
        verified = MAX(excluded.verified, scores.verified),
        displayName = excluded.displayName
    `);
    stmt.run(gameId, dateKey, playerId, displayName, score, verifiedInt);
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

  public checkAndUpdateRateLimit(playerId: string, cooldownMs: number): boolean {
    const now = Date.now();

    const row = this.db.prepare(
        "SELECT lastSubmission FROM rate_limits WHERE playerId = ?"
    ).get(playerId) as { lastSubmission: number } | undefined;

    if (row && now - row.lastSubmission < cooldownMs) {
        return false;
    }

    this.db.prepare(
        "INSERT OR REPLACE INTO rate_limits (playerId, lastSubmission) VALUES (?, ?)"
    ).run(playerId, now);

    return true;
  }
}

export const leaderboardStore = new DailyLeaderboardStore();
