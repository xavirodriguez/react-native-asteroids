import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import express from "express";
import { createServer } from "http";
import { AsteroidsRoom } from "./AsteroidsRoom";
import { FlappyBirdRoom } from "./FlappyBirdRoom";
import { PongRoom } from "./PongRoom";
import { SpaceInvadersRoom } from "./SpaceInvadersRoom";

const port = Number(process.env.PORT || 2567);
const app = express();

app.use(express.json());

const gameServer = new Server({
  transport: new WebSocketTransport({
    server: createServer(app)
  })
});

gameServer.define("asteroids", AsteroidsRoom as any);
gameServer.define("flappybird", FlappyBirdRoom as any);
gameServer.define("pong", PongRoom as any);
gameServer.define("spaceinvaders", SpaceInvadersRoom as any);

gameServer.listen(port);
console.log(`Listening on ws://localhost:${port}`);
