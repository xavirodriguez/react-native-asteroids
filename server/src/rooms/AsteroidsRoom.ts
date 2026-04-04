import { Room, Client } from "colyseus";
import { GameState, EntityState } from "../schema/GameState";

/**
 * Colyseus Room for the Asteroids game.
 * Manages authoritative game state and input processing.
 */
export class AsteroidsRoom extends Room<any> {
  // Max clients per room
  maxClients = 4;

  /**
   * Called when the room is created.
   */
  onCreate(options: any) {
    this.setState(new GameState());

    // Set up the simulation interval (60 FPS)
    this.setSimulationInterval((deltaTime: number) => this.update(deltaTime), 16.6);

    // Set up the patch rate (20 FPS)
    this.setPatchRate(50);

    // Register message handlers
    this.onMessage("input", (client: Client, message: any) => {
      this.handleInput(client, message);
    });

    console.log("AsteroidsRoom created with options:", options);
  }

  /**
   * Called when a client joins the room.
   */
  onJoin(client: Client, options: any) {
    console.log(client.sessionId, "joined!");

    // Add a new player entity to the state
    const player = new EntityState();
    player.x = 400; // Screen center approx
    player.y = 300;
    player.type = "Ship";
    player.radius = 15;

    this.state.entities.set(client.sessionId, player);
  }

  /**
   * Called when a client leaves the room.
   */
  onLeave(client: Client, code?: number) {
    console.log(client.sessionId, "left with code:", code);
    this.state.entities.delete(client.sessionId);
  }

  /**
   * Main simulation loop.
   */
  update(deltaTime: number) {
    // Authoritative logic for movement and collisions would go here
  }

  /**
   * Handles incoming player inputs.
   */
  handleInput(client: Client, input: any) {
    const player = this.state.entities.get(client.sessionId);
    if (!player) return;
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }
}
