export class MultiplayerClient {
    room = null;

    async connect(serverUrl, playerName) {
        console.log('Connecting');
    }

    sendInput(input) {
        if (this.room) this.room.send('input', input);
    }

    disconnect() {
        if (this.room) this.room.leave();
    }
}