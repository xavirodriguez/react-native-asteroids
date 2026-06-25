"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsteroidsState = exports.Bullet = exports.Asteroid = exports.Player = void 0;
const schema_1 = require("@colyseus/schema");
class Player extends schema_1.Schema {
    sessionId;
    name;
    x;
    y;
    angle;
    score;
    lives;
    alive;
    velocityX;
    velocityY;
}
exports.Player = Player;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "sessionId", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "name", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "angle", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "score", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "lives", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], Player.prototype, "alive", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "velocityX", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "velocityY", void 0);
class Asteroid extends schema_1.Schema {
    id;
    x;
    y;
    size;
}
exports.Asteroid = Asteroid;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Asteroid.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Asteroid.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Asteroid.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Asteroid.prototype, "size", void 0);
class Bullet extends schema_1.Schema {
    x;
    y;
    ownerId;
}
exports.Bullet = Bullet;
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Bullet.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Bullet.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Bullet.prototype, "ownerId", void 0);
class AsteroidsState extends schema_1.Schema {
    seed;
    gameWidth;
    gameHeight;
    gameStarted;
    gameOver;
    serverTick;
    lastProcessedTick;
    score;
    protocolVersion = 1;
    players = new schema_1.MapSchema();
    asteroids = new schema_1.MapSchema();
    bullets = new schema_1.MapSchema();
    fullWorldState;
}
exports.AsteroidsState = AsteroidsState;
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], AsteroidsState.prototype, "seed", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], AsteroidsState.prototype, "gameWidth", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], AsteroidsState.prototype, "gameHeight", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], AsteroidsState.prototype, "gameStarted", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], AsteroidsState.prototype, "gameOver", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], AsteroidsState.prototype, "serverTick", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], AsteroidsState.prototype, "lastProcessedTick", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], AsteroidsState.prototype, "score", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], AsteroidsState.prototype, "protocolVersion", void 0);
__decorate([
    (0, schema_1.type)({ map: Player }),
    __metadata("design:type", Object)
], AsteroidsState.prototype, "players", void 0);
__decorate([
    (0, schema_1.type)({ map: Asteroid }),
    __metadata("design:type", Object)
], AsteroidsState.prototype, "asteroids", void 0);
__decorate([
    (0, schema_1.type)({ map: Bullet }),
    __metadata("design:type", Object)
], AsteroidsState.prototype, "bullets", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], AsteroidsState.prototype, "fullWorldState", void 0);
