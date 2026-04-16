import { Room, Client } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";
import { PongInput, PongInputFrame } from "../../src/games/pong/types";

class PongPlayer extends Schema {
  @type("string") sessionId: string;
  @type("boolean") connected: boolean = true;
  @type("number") playerNumber: number; // 1 or 2
  @type("boolean") ready: boolean = false;
}

class PongStateSchema extends Schema {
  @type("boolean") gameStarted: boolean = false;
  @type("number") serverTick: number = 0;
  @type("number") seed: number = 0;
  @type({ map: PongPlayer }) players = new MapSchema<PongPlayer>();
}

/**
 * Server-side room for Pong.
 * Implements an input relay for lockstep synchronization.
 */
export class PongRoom extends Room<PongStateSchema> {
  declare state: PongStateSchema;
  maxClients = 2;
  private inputBuffer = new Map<number, Map<string, PongInput>>();

  onCreate(options: { seed?: number }) {
    this.setState(new PongStateSchema());
    this.state.seed = options.seed || Math.floor(Math.random() * 100000);

    this.onMessage("input", (client, message: PongInputFrame) => {
      let tickInputs = this.inputBuffer.get(message.tick);
      if (!tickInputs) {
        tickInputs = new Map<string, PongInput>();
        this.inputBuffer.set(message.tick, tickInputs);
      }
      tickInputs.set(client.sessionId, message.input);

      // If we have inputs from both players for this tick, we can broadcast them
      // In a strict lockstep, we wait for all. In an optimistic relay, we just forward.
      // Here we act as a relay:
      this.broadcast("input_relay", {
        tick: message.tick,
        sessionId: client.sessionId,
        input: message.input
      });
    });

    this.onMessage("ready", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
          player.ready = true;
          const allReady = Array.from(this.state.players.values()).every(p => p.ready);
          if (this.state.players.size === 2 && allReady) {
              this.state.gameStarted = true;
              this.broadcast("start", { seed: this.state.seed });
          }
      }
    });
  }

  onJoin(client: Client, _options: unknown) {
    const player = new PongPlayer();
    player.sessionId = client.sessionId;

    // Assign the first available player number (1 or 2)
    const existingNumbers = Array.from(this.state.players.values()).map(p => p.playerNumber);
    player.playerNumber = existingNumbers.includes(1) ? 2 : 1;

    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client, _consented: boolean) {
    this.state.players.delete(client.sessionId);
  }
}
