// GameRoomState.ts

class GameRoomState {
    players: { [id: string]: PlayerState; };
    gameObjects: GameObject[];

    constructor() {
        this.players = {};
        this.gameObjects = [];
    }

    addPlayer(playerId: string, playerState: PlayerState) {
        this.players[playerId] = playerState;
    }

    updatePlayer(playerId: string, newState: PlayerState) {
        if (this.players[playerId]) {
            this.players[playerId] = newState;
        }
    }

    removePlayer(playerId: string) {
        delete this.players[playerId];
    }

    addGameObject(gameObject: GameObject) {
        this.gameObjects.push(gameObject);
    }

    updateGameObject(gameObjectId: string, newGameObject: GameObject) {
        const index = this.gameObjects.findIndex(obj => obj.id === gameObjectId);
        if (index !== -1) {
            this.gameObjects[index] = newGameObject;
        }
    }

    removeGameObject(gameObjectId: string) {
        this.gameObjects = this.gameObjects.filter(obj => obj.id !== gameObjectId);
    }
}

interface PlayerState {
    position: { x: number; y: number; };
    score: number;
}

interface GameObject {
    id: string;
    type: string;
    position: { x: number; y: number; };
}