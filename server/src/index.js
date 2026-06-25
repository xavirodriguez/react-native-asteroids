"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@colyseus/core");
const ws_transport_1 = require("@colyseus/ws-transport");
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const AsteroidsRoom_1 = require("./AsteroidsRoom");
const FlappyBirdRoom_1 = require("./FlappyBirdRoom");
const PongRoom_1 = require("./PongRoom");
const SpaceInvadersRoom_1 = require("./SpaceInvadersRoom");
const port = Number(process.env.PORT || 2567);
const app = (0, express_1.default)();
app.use(express_1.default.json());
const gameServer = new core_1.Server({
    transport: new ws_transport_1.WebSocketTransport({
        server: (0, http_1.createServer)(app)
    })
});
gameServer.define("asteroids", AsteroidsRoom_1.AsteroidsRoom);
gameServer.define("flappybird", FlappyBirdRoom_1.FlappyBirdRoom);
gameServer.define("pong", PongRoom_1.PongRoom);
gameServer.define("spaceinvaders", SpaceInvadersRoom_1.SpaceInvadersRoom);
gameServer.listen(port);
console.log(`Listening on ws://localhost:${port}`);
