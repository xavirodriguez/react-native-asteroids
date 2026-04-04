import http from "http";
import express from "express";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { AsteroidsRoom } from "./rooms/AsteroidsRoom";

const port = Number(process.env.PORT || 2567);
const app = express();

app.use(express.json());

const server = http.createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({
    server
  })
});

// Define room handlers
gameServer.define("asteroids", AsteroidsRoom);

gameServer.listen(port);
console.log(`Listening on ws://localhost:${port}`);
