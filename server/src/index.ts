import { Server, LocalPresence, LocalDriver } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import express from "express";
import http from "http";
import { AsteroidsRoom } from "./AsteroidsRoom";
import { SpaceInvadersRoom } from "./SpaceInvadersRoom";
import { FlappyBirdRoom } from "./FlappyBirdRoom";
import { PongRoom } from "./PongRoom";
import { leaderboardStore } from "./DailyLeaderboardStore";
import { generateScoreSignature } from "./utils/SecurityUtils";

// Simple in-memory rate limiter for score submissions
const submissionTimestamps = new Map<string, number>();
const SUBMISSION_COOLDOWN = 10000; // 10 seconds

const app = express();
app.use(express.json());

const server = http.createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({
    server: server
  }),
  presence: new LocalPresence(),
  driver: new LocalDriver(),
});

gameServer.define("asteroids", AsteroidsRoom);
gameServer.define("spaceinvaders", SpaceInvadersRoom);
gameServer.define("flappybird", FlappyBirdRoom);
gameServer.define("pong", PongRoom);

// HTTP Endpoints for Leaderboard
app.get("/daily-leaderboard", (req, res) => {
  const { gameId, dateKey } = req.query;
  if (!gameId || !dateKey) return res.status(400).send("Missing query params");
  const entries = leaderboardStore.getEntries(gameId as string, dateKey as string);
  res.json(entries);
});

app.post("/daily-score", (req, res) => {
  const { gameId, dateKey, playerId, score, displayName, signature } = req.body;
  if (!gameId || !dateKey || !playerId || score === undefined || !signature) {
    return res.status(400).send("Missing body fields");
  }

  // Basic Rate Limiting
  const now = Date.now();
  const lastSubmission = submissionTimestamps.get(playerId) || 0;
  if (now - lastSubmission < SUBMISSION_COOLDOWN) {
    return res.status(429).send("Too many submissions. Please wait.");
  }
  submissionTimestamps.set(playerId, now);

  // Signature Verification
  // IMPORTANT: For multiplayer games, scores are now authoritative and recorded by the room onLeave.
  // This endpoint is only preserved for solo daily challenges.
  const expectedSignature = generateScoreSignature(gameId, dateKey, playerId, score);
  if (signature !== expectedSignature) {
    console.warn(`[Security] Invalid score signature from ${playerId} for ${gameId}. Expected ${expectedSignature}, got ${signature}`);
    return res.status(403).send("Invalid score signature. Nice try!");
  }

  // Validation
  const validGames = ["asteroids", "spaceinvaders", "flappybird", "pong"];
  if (!validGames.includes(gameId)) return res.status(400).send("Invalid gameId");

  if (typeof score !== "number" || score < 0 || score > 10000000) {
    return res.status(400).send("Invalid score");
  }

  if (displayName && (typeof displayName !== "string" || displayName.length > 20)) {
    return res.status(400).send("Invalid displayName");
  }

  leaderboardStore.addScore(gameId, dateKey, playerId, score, displayName);
  res.json({ success: true });
});

gameServer.listen(2567).then(() => {
  console.log("Retro Arcade server listening on http://localhost:2567");
});
