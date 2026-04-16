import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { TransformComponent, VelocityComponent, RenderComponent, Component } from "../../../engine/types/EngineTypes";
import { GameStateComponent, GAME_CONFIG } from "../types/SpaceInvadersTypes";

export interface KamikazeComponent extends Component {
  type: "Kamikaze";
  phase: "diving" | "returning";
  originX: number;
  originY: number;
  diveSpeed: number;
}

export class KamikazeSystem extends System {
  private spawnCooldown = 5000;
  private timer = 0;

  public update(world: World, deltaTime: number): void {
    const gameState = world.getSingleton<GameStateComponent>("GameState");
    if (!gameState || gameState.isGameOver) return;

    this.timer += deltaTime;

    const invaders = world.query("Invader");
    const totalInvaders = GAME_CONFIG.INVADER_ROWS * GAME_CONFIG.INVADER_COLS;

    // Trigger kamikazes if enough invaders are dead and cooldown passed
    if (invaders.length < totalInvaders * 0.6 && this.timer > this.spawnCooldown && gameState.kamikazesActive < 2) {
      this.timer = 0;
      this.spawnKamikaze(world, invaders, gameState);
    }

    const kamikazes = world.query("Kamikaze", "Transform", "Velocity");
    const players = world.query("Player", "Transform");
    const playerPos = players.length > 0 ? world.getComponent<TransformComponent>(players[0], "Transform") : null;

    kamikazes.forEach(entity => {
      const kami = world.getComponent<KamikazeComponent>(entity, "Kamikaze")!;
      const pos = world.getComponent<TransformComponent>(entity, "Transform")!;
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity")!;
      const render = world.getComponent<RenderComponent>(entity, "Render")!;

      if (kami.phase === "diving") {
        if (playerPos) {
          const dx = playerPos.x - pos.x;
          const dy = playerPos.y - pos.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          vel.dx = (dx / dist) * kami.diveSpeed;
          vel.dy = (dy / dist) * kami.diveSpeed;
        } else {
          vel.dy = kami.diveSpeed;
        }

        render.rotation = Math.atan2(vel.dy, vel.dx) + Math.PI / 2;

        if (pos.y > GAME_CONFIG.SCREEN_HEIGHT - 50) {
          kami.phase = "returning";
        }
      } else if (kami.phase === "returning") {
        const dx = kami.originX - pos.x;
        const dy = kami.originY - pos.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < 10) {
          world.removeComponent(entity, "Kamikaze");
          gameState.kamikazesActive--;
          vel.dx = 0;
          vel.dy = 0;
          render.rotation = 0;
        } else {
          vel.dx = (dx / dist) * (kami.diveSpeed * 0.5);
          vel.dy = (dy / dist) * (kami.diveSpeed * 0.5);
        }
      }
    });
  }

  private spawnKamikaze(world: World, invaders: ReadonlyArray<number>, gameState: GameStateComponent): void {
    if (invaders.length === 0) return;
    const randomIndex = Math.floor(Math.random() * invaders.length);
    const invader = invaders[randomIndex];
    const pos = world.getComponent<TransformComponent>(invader, "Transform");
    const render = world.getComponent<RenderComponent>(invader, "Render");

    if (pos && render && !world.getComponent(invader, "Kamikaze")) {
      world.addComponent(invader, {
        type: "Kamikaze",
        phase: "diving",
        originX: pos.x,
        originY: pos.y,
        diveSpeed: 150,
      } as KamikazeComponent);
      render.color = "#FF4444";
      gameState.kamikazesActive++;
    }
  }
}
