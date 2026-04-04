import express from 'express';
import { Server } from 'colyseus';
import { WebSocketTransport } from 'colyseus/lib/transport/WebSocketTransport';

const app = express();
const port = 3000;
const gameServer = new Server({
    transport: new WebSocketTransport(),
});

app.get('/', (req, res) => {
    res.send('Colyseus Server is running!');
});

gameServer.define('my_room', class extends colyseus.Room {
    onCreate(options) {
        console.log('MyRoom created!', options);
    }

    onJoin(client) {
        console.log('Client joined!', client.sessionId);
    }

    onLeave(client) {
        console.log('Client left!', client.sessionId);
    }
});

app.listen(port, () => {
    console.log(`Express server is listening on http://localhost:${port}`);
    gameServer.listen(port);
});