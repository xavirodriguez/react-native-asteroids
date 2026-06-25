"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsteroidsRoom = void 0;
const core_1 = require("@colyseus/core");
const GameState_1 = require("./schema/GameState");
const core_2 = require("@tiny-aster/core");
const AsteroidsGame_1 = require("../../src/games/asteroids/AsteroidsGame");
const EntityFactory_1 = require("../../src/games/asteroids/EntityFactory");
const DailyLeaderboardStore_1 = require("./DailyLeaderboardStore");
const DateUtils_1 = require("./utils/DateUtils");
const NetworkMetrics_1 = require("./metrics/NetworkMetrics");
/**
 * Authoritative game room for the Asteroids simulation.
 *
 * @remarks
 * This room runs a headless version of the {@link AsteroidsGame} and manages
 * authoritative state synchronization, input buffering, and replication budgets.
 *
 * @warning
 * **Replication & Bandwidth**: Large numbers of entities or frequent state
 * updates may exceed the network budget. The room uses different replication
 * modes (interest management, delta compression) intended to help mitigate this;
 * however, consistency remains dependent on the configured patch rate, network
 * conditions, and client ACK stability.
 */
class AsteroidsRoom extends core_1.Room {
    maxClients = 4;
    fixedTimeStep = 16.66;
    inputBuffers = new Map();
    stateHistory = new Map();
    clientAcks = new Map();
    replayFrames = [];
    gameSimulation;
    world;
    playerEntities = new Map();
    newClients = new Set();
    nextPlayerNumber = 1;
    networkMetrics = new NetworkMetrics_1.NetworkMetricsCollector();
    replicationTracker = new core_2.ReplicationStateTracker();
    ackTracker = new core_2.ClientAckTracker();
    budgetManager = new core_2.NetworkBudgetManager();
    deltaSystem = new core_2.NetworkDeltaSystem(this.replicationTracker);
    REPLICATION_MODE = 'binary';
    spawnAsteroids(count) {
        const gameplayRandom = this.world.gameplayRandom;
        for (let i = 0; i < count; i++) {
            const x = gameplayRandom.nextRange(0, 800);
            const y = gameplayRandom.nextRange(0, 600);
            (0, EntityFactory_1.createAsteroid)({ world: this.world, x, y, size: "large" });
        }
    }
    async onCreate(options) {
        if (options.replicationMode) {
            this.REPLICATION_MODE = options.replicationMode;
        }
        this.newClients.clear();
        this.setState(new GameState_1.AsteroidsState());
        this.state.seed = options.seed || Math.floor(Math.random() * 0xFFFFFFFF);
        this.gameSimulation = new AsteroidsGame_1.AsteroidsGame({
            headless: true,
            isMultiplayer: true,
            seed: this.state.seed
        });
        await this.gameSimulation.initialize();
        this.world = this.gameSimulation.getWorld();
        this.state.gameWidth = 800;
        this.state.gameHeight = 600;
        this.state.gameStarted = false;
        this.state.gameOver = false;
        this.state.serverTick = 0;
        this.setPatchRate(50);
        this.setSimulationInterval((dt) => this.update(dt));
        this.onMessage("input", (client, frame) => {
            const buffer = this.inputBuffers.get(client.sessionId) || [];
            buffer.push(frame);
            this.inputBuffers.set(client.sessionId, buffer);
        });
        this.onMessage("sync_tick", (client, data) => {
            if (data?.lastAckedVersion !== undefined) {
                this.clientAcks.set(client.sessionId, data.lastAckedVersion);
            }
            if (data?.sequence !== undefined) {
                this.ackTracker.recordAck(client.sessionId, data.sequence, this.state.serverTick);
            }
            client.send("sync_tick", {
                protocolVersion: this.state.protocolVersion,
                serverTick: this.state.serverTick,
                timestamp: (data?.timestamp && data.timestamp > 0) ? data.timestamp : Date.now()
            });
        });
        this.onMessage("start_game", () => {
            if (this.state.gameStarted)
                return;
            this.state.gameStarted = true;
            this.spawnAsteroids(6);
            this.world.getEventBus().on("game:over", () => {
                this.state.gameOver = true;
                console.log(`[AsteroidsRoom] Game Over. Final Authoritative Score: ${this.state.score}`);
            });
        });
        this.onMessage("metrics", (client) => {
            client.send("metrics", {
                protocolVersion: this.state.protocolVersion,
                ...this.networkMetrics.getMetrics()
            });
        });
        this.world.addSystem(new core_2.InterestManagerSystem());
    }
    onJoin(client, options) {
        const gameplayRandom = this.world.gameplayRandom;
        const player = new GameState_1.Player();
        player.sessionId = client.sessionId;
        player.name = options.name || `Player ${this.nextPlayerNumber++}`;
        player.x = gameplayRandom.nextRange(100, 700);
        player.y = gameplayRandom.nextRange(100, 500);
        player.angle = 0;
        player.score = 0;
        player.lives = 3;
        player.alive = true;
        this.state.players.set(client.sessionId, player);
        const entity = (0, EntityFactory_1.createShip)({ world: this.world, x: player.x, y: player.y });
        this.playerEntities.set(client.sessionId, entity);
        this.newClients.add(client.sessionId);
        this.world.addComponent(entity, {
            type: "Ship",
            sessionId: client.sessionId,
        });
    }
    async onLeave(client, _code) {
        const player = this.state.players.get(client.sessionId);
        if (player && player.score > 0) {
            const dateKey = (0, DateUtils_1.getDateKey)();
            console.log(`[AsteroidsRoom] Recording authoritative score for ${player.name}: ${player.score}`);
            DailyLeaderboardStore_1.leaderboardStore.addScore("asteroids", dateKey, player.sessionId, player.score, player.name, true);
        }
        try {
            if (_code === core_1.CloseCode.CONSENTED)
                throw new Error("consented leave");
            await this.allowReconnection(client, 10);
        }
        catch (_err) {
            this.state.players.delete(client.sessionId);
            this.inputBuffers.delete(client.sessionId);
            this.clientAcks.delete(client.sessionId);
            this.newClients.delete(client.sessionId);
        }
    }
    update(_dt) {
        if (!this.state.gameStarted)
            return;
        this.state.serverTick++;
        this.state.lastProcessedTick = this.state.serverTick;
        const currentInputs = {};
        this.state.players.forEach((_player, sessionId) => {
            const entity = this.playerEntities.get(sessionId);
            if (entity === undefined)
                return;
            const buffer = this.inputBuffers.get(sessionId);
            if (buffer) {
                const frame = buffer.find(f => f.tick === this.state.serverTick);
                if (frame) {
                    this.gameSimulation.applyInputToEntity(entity, frame);
                    currentInputs[sessionId] = [frame];
                }
            }
        });
        this.gameSimulation.runSimulationStep(this.fixedTimeStep, false);
        this.syncWorldToSchema();
        let totalBytesSentThisTick = 0;
        let totalSerializationMs = 0;
        let totalEntitiesFiltered = 0;
        const totalEntitiesInWorld = this.world.entities.length;
        if (this.REPLICATION_MODE === 'legacy') {
            const fullSerializationStart = Date.now();
            const snapshot = this.world.snapshot();
            const serialized = JSON.stringify(snapshot);
            totalSerializationMs += (Date.now() - fullSerializationStart);
            this.state.fullWorldState = serialized;
            totalBytesSentThisTick = serialized.length;
        }
        else {
            const detailedInterestMap = this.world.getResource("DetailedInterestMap");
            this.clients.forEach((client) => {
                const isNew = this.newClients.has(client.sessionId);
                const interest = detailedInterestMap?.get(client.sessionId) || [];
                let interestIds;
                if (this.REPLICATION_MODE === 'interest' || isNew) {
                    interestIds = new Set(interest.map((e) => parseInt(e.entityId)));
                }
                else {
                    const selfEntityId = this.playerEntities.get(client.sessionId)?.toString();
                    const prioritized = this.budgetManager.prioritize(client.sessionId, interest, selfEntityId);
                    interestIds = new Set(prioritized.map((e) => parseInt(e.entityId)));
                }
                totalEntitiesFiltered += (totalEntitiesInWorld - interestIds.size);
                const serializationStart = Date.now();
                if (this.REPLICATION_MODE === 'interest' || isNew) {
                    const snapshot = this.world.snapshot();
                    if (!isNew) {
                        snapshot.entities = snapshot.entities.filter(id => interestIds.has(id));
                        for (const type in snapshot.componentData) {
                            for (const id in snapshot.componentData[type]) {
                                if (!interestIds.has(parseInt(id))) {
                                    delete snapshot.componentData[type][id];
                                }
                            }
                        }
                    }
                    const serialized = JSON.stringify(snapshot);
                    totalSerializationMs += (Date.now() - serializationStart);
                    totalBytesSentThisTick += serialized.length;
                    client.send("world_delta", {
                        protocolVersion: this.state.protocolVersion,
                        tick: this.state.serverTick,
                        delta: serialized
                    });
                    if (isNew)
                        this.newClients.delete(client.sessionId);
                }
                else {
                    const sequence = this.ackTracker.nextSequence(client.sessionId);
                    const baselineAck = this.ackTracker.getLastAckedSequence(client.sessionId);
                    const idleTime = this.ackTracker.getIdleTime(client.sessionId);
                    const forceFull = idleTime > 3000 || baselineAck === 0;
                    const deltaPacket = this.deltaSystem.generateDelta(this.world, client.sessionId, sequence, baselineAck, interestIds, forceFull);
                    if (this.REPLICATION_MODE === 'binary') {
                        const binaryPacket = core_2.BinaryCompression.pack(deltaPacket);
                        totalSerializationMs += (Date.now() - serializationStart);
                        totalBytesSentThisTick += binaryPacket.length;
                        client.send("world_delta_bin", binaryPacket);
                    }
                    else {
                        const serialized = JSON.stringify(deltaPacket);
                        totalSerializationMs += (Date.now() - serializationStart);
                        totalBytesSentThisTick += serialized.length;
                        client.send("world_delta", {
                            protocolVersion: this.state.protocolVersion,
                            tick: this.state.serverTick,
                            delta: serialized
                        });
                    }
                }
            });
            if (this.state.serverTick % 60 === 0) {
                const snapshot = this.world.snapshot();
                this.state.fullWorldState = JSON.stringify(snapshot);
            }
        }
        const trackedEntitiesCount = this.state.players.size + this.state.asteroids.size + this.state.bullets.size;
        this.networkMetrics.recordTick(totalBytesSentThisTick, trackedEntitiesCount, totalSerializationMs, this.clients.length, this.clients.length > 0 ? totalEntitiesFiltered / this.clients.length : 0);
        this.replayFrames.push({
            tick: this.state.serverTick,
            inputs: currentInputs,
            events: []
        });
        if (this.replayFrames.length > 18000) {
            this.replayFrames.shift();
        }
        this.state.players.forEach((_player, sessionId) => {
            const buffer = this.inputBuffers.get(sessionId);
            if (buffer) {
                this.inputBuffers.set(sessionId, buffer.filter(f => f.tick > this.state.serverTick));
            }
        });
        this.stateHistory.set(this.state.serverTick, this.world.snapshot());
        const oldestTick = this.state.serverTick - 120;
        this.stateHistory.delete(oldestTick);
        if (this.state.gameOver && this.replayFrames.length > 0) {
            this.broadcast("replay", {
                protocolVersion: this.state.protocolVersion,
                version: 1,
                roomId: this.roomId,
                startTick: this.replayFrames[0].tick,
                endTick: this.state.serverTick,
                frames: this.replayFrames
            });
            this.replayFrames = [];
        }
    }
    onDispose() {
        console.log(`[AsteroidsRoom] Disposing room ${this.roomId}`);
        this.stateHistory.clear();
        this.inputBuffers.clear();
        this.clientAcks.clear();
        this.playerEntities.clear();
        this.newClients.clear();
        this.replayFrames = [];
        if (this.gameSimulation) {
            this.gameSimulation.destroy();
        }
    }
    syncWorldToSchema() {
        this.playerEntities.forEach((entity, sessionId) => {
            const player = this.state.players.get(sessionId);
            if (!player)
                return;
            const pos = this.world.getComponent(entity, "Transform");
            const vel = this.world.getComponent(entity, "Velocity");
            const render = this.world.getComponent(entity, "Render");
            const health = this.world.getComponent(entity, "Health");
            if (pos) {
                player.x = pos.x;
                player.y = pos.y;
                player.angle = pos.rotation;
            }
            if (render) {
                if (render.rotation !== undefined)
                    player.angle = render.rotation;
            }
            if (vel) {
                player.velocityX = vel.vx;
                player.velocityY = vel.vy;
            }
            if (health) {
                player.lives = health.current;
                player.alive = health.current > 0;
            }
            const ship = this.world.getComponent(entity, "Ship");
            if (ship) {
                // score logic if available
            }
        });
        const asteroidEntities = this.world.query("Asteroid", "Transform");
        const currentAsteroidIds = new Set();
        asteroidEntities.forEach(entity => {
            const id = entity.toString();
            currentAsteroidIds.add(id);
            const pos = this.world.getComponent(entity, "Transform");
            const asteroidComp = this.world.getComponent(entity, "Asteroid");
            let asteroid = this.state.asteroids.get(id);
            if (!asteroid) {
                asteroid = new GameState_1.Asteroid();
                asteroid.id = id;
                this.state.asteroids.set(id, asteroid);
            }
            asteroid.x = pos.x;
            asteroid.y = pos.y;
            asteroid.size = asteroidComp.size === "large" ? 3 : asteroidComp.size === "medium" ? 2 : 1;
        });
        this.state.asteroids.forEach((_, id) => {
            if (!currentAsteroidIds.has(id))
                this.state.asteroids.delete(id);
        });
        const bulletEntities = this.world.query("Bullet", "Transform");
        const currentBulletIds = new Set();
        bulletEntities.forEach(entity => {
            const id = entity.toString();
            currentBulletIds.add(id);
            const pos = this.world.getComponent(entity, "Transform");
            let bullet = this.state.bullets.get(id);
            if (!bullet) {
                bullet = new GameState_1.Bullet();
                this.state.bullets.set(id, bullet);
            }
            bullet.x = pos.x;
            bullet.y = pos.y;
            const bulletComp = this.world.getComponent(entity, "Bullet");
            if (bulletComp?.ownerId) {
                bullet.ownerId = bulletComp.ownerId;
            }
        });
        this.state.bullets.forEach((_, id) => {
            if (!currentBulletIds.has(id))
                this.state.bullets.delete(id);
        });
        const gameState = this.world.getSingleton("GameState");
        if (gameState && this.state.players.size > 0) {
            this.state.score = gameState.score;
            let anyAlive = false;
            this.state.players.forEach((p) => { if (p.alive)
                anyAlive = true; });
            if (!anyAlive && this.state.gameStarted)
                this.state.gameOver = true;
        }
    }
}
exports.AsteroidsRoom = AsteroidsRoom;
