"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseGameStateSystem = void 0;
const System_1 = require("../ecs/System");
class BaseGameStateSystem extends System_1.System {
    singletonType;
    _world;
    constructor(singletonType) {
        super();
        this.singletonType = singletonType;
    }
    onRegister(world) {
        this._world = world;
    }
    update(world, deltaTime) {
        const gameState = this.getGameState(world);
        if (!gameState)
            return;
        if (gameState.isGameOver)
            return;
        this.updateGameState(world, gameState, deltaTime);
        if (this.evaluateGameOverCondition(gameState)) {
            gameState.isGameOver = true;
            world.getEventBus().emit("game:over", { state: gameState });
        }
    }
}
exports.BaseGameStateSystem = BaseGameStateSystem;
