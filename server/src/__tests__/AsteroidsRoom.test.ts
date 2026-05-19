import { AsteroidsRoom } from "../AsteroidsRoom";
import { AsteroidsState } from "../schema/GameState";

describe("AsteroidsRoom Authoritative Score", () => {
    let room: AsteroidsRoom;

    beforeEach(async () => {
        room = new AsteroidsRoom();
        // @ts-expect-error - Manual state injection for testing
        room.state = new AsteroidsState();
        // @ts-expect-error - Accessing protected method for testing
        await room.onCreate({ seed: 12345 });
    });

    test("should sync ecs score to player state", () => {
        // Mock a player
        const client = { sessionId: "p1" } as any;
        room.onJoin(client, { name: "Player 1" });

        const world = (room as any).world;

        // Manually increment score in ECS
        world.mutateSingleton("GameState", (gs: any) => {
            gs.score = 500;
        });

        // Run sync
        (room as any).syncWorldToSchema();

        const player = room.state.players.get("p1");
        expect(player?.score).toBe(500);
    });
});
