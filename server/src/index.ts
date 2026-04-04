import { defineServer, defineRoom, LocalPresence, LocalDriver } from "@colyseus/core";
import { AsteroidsRoom } from "./AsteroidsRoom";
import { SpaceInvadersRoom } from "./SpaceInvadersRoom";
import { FlappyBirdRoom } from "./FlappyBirdRoom";

const gameServer = defineServer({
  presence: new LocalPresence(),
  driver: new LocalDriver(),
  rooms: {
    asteroids: defineRoom(AsteroidsRoom),
    spaceinvaders: defineRoom(SpaceInvadersRoom),
    flappybird: defineRoom(FlappyBirdRoom),
  },
});

gameServer.listen(2567).then(() => {
  console.log("Retro Arcade server listening on ws://localhost:2567");
});
