"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsteroidGameStateSystem = void 0;
const core_1 = require("@tiny-aster/core");
class AsteroidGameStateSystem extends core_1.BaseGameStateSystem {
    constructor(game) {
        super(game);
    }
    getGameState(world) {
        return world.getSingleton("GameState");
    }
    updateGameState(world, gameState, deltaTime) {
        // Logic for wave management, score, etc.
    }
    evaluateGameOverCondition(gameState) {
        return gameState.lives <= 0;
    }
    update(world, deltaTime) {
        super.update(world, deltaTime);
    }
    isGameOver() {
        const state = this.game.getGameState();
        return state.isGameOver;
    }
    resetGameOverState(world) {
        world.mutateSingleton("GameState", (state) => {
            state.isGameOver = false;
            state.lives = 3;
            state.score = 0;
            state.level = 1;
        });
    }
}
exports.AsteroidGameStateSystem = AsteroidGameStateSystem;
