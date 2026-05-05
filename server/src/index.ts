import { defineServer, defineRoom, LocalPresence, LocalDriver } from "@colyseus/core";
import { AsteroidsRoom } from "./AsteroidsRoom";
import { SpaceInvadersRoom } from "./SpaceInvadersRoom";
import { FlappyBirdRoom } from "./FlappyBirdRoom";
import { PongRoom } from "./PongRoom";
import { DailyLeaderboardStore } from "./DailyLeaderboardStore";

const leaderboardStore = new DailyLeaderboardStore();

const gameServer = defineServer({
  presence: new LocalPresence(),
  driver: new LocalDriver(),
  rooms: {
    asteroids: defineRoom(AsteroidsRoom),
    spaceinvaders: defineRoom(SpaceInvadersRoom),
    flappybird: defineRoom(FlappyBirdRoom),
  },
});

gameServer.listen(2567).then((server) => {
  // HTTP Endpoints for Leaderboard
  server.app.get("/daily-leaderboard", (req, res) => {
    const { gameId, dateKey } = req.query;
    if (!gameId || !dateKey) return res.status(400).send("Missing query params");
    const entries = leaderboardStore.getEntries(gameId as string, dateKey as string);
    res.json(entries);
  });

  server.app.post("/daily-score", (req, res) => {
    const { gameId, dateKey, playerId, score, displayName } = req.body;
    if (!gameId || !dateKey || !playerId || score === undefined) return res.status(400).send("Missing body fields");

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

  console.log("Retro Arcade server listening on http://localhost:2567");
});
