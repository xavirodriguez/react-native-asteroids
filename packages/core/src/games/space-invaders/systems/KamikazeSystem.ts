import { System, World } from "../../../index";
import { TransformComponent, VelocityComponent, RenderComponent, Component } from "../../../index";
import { GameStateComponent, KamikazeComponent, SpaceInvadersComponentRegistry, GAME_CONFIG } from "../types/SpaceInvadersTypes";
import { SpaceInvadersConfig } from "../types/SpaceInvadersConfigSchema";

export class KamikazeSystem extends System<SpaceInvadersComponentRegistry> {
  private spawnCooldown = 5000;
  private timer = 0;
  private config?: SpaceInvadersConfig;

  public update(world: World<SpaceInvadersComponentRegistry>, deltaTime: number): void {
    if (!this.config) {
        this.config = world.getResource<SpaceInvadersConfig>("GameConfig")!;
    }
    const gameState = world.getSingleton("GameState");
    if (!gameState || gameState.isGameOver) return;

    this.timer += deltaTime;

    const invaders = world.query("Invader");
    const totalInvaders = this.config.INVADER_ROWS * this.config.INVADER_COLS;

    // Trigger kamikazes if enough invaders are dead and cooldown passed
    if (invaders.length < totalInvaders * 0.6 && this.timer > this.spawnCooldown && gameState.kamikazesActive < 2) {
      this.timer = 0;
      this.spawnKamikaze(world, invaders);
    }

    const kamikazes = world.query("Kamikaze", "Transform", "Velocity");
    const players = world.query("Player", "Transform");
    const playerPos = players.length > 0 ? world.getComponent(players[0], "Transform") : null;

    kamikazes.forEach(entity => {
      const kami = world.getComponent(entity, "Kamikaze")!;
      const pos = world.getComponent(entity, "Transform")!;

      if (kami.phase === "diving") {
        let currentVx = 0;
        let currentVy = 0;

        if (playerPos) {
          const dx = playerPos.x - pos.x;
          const dy = playerPos.y - pos.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          world.mutateComponent(entity, "Velocity", v => {
              v.vx = (dx / dist) * kami.diveSpeed;
              v.vy = (dy / dist) * kami.diveSpeed;
              currentVx = v.vx;
              currentVy = v.vy;
          });
        } else {
          world.mutateComponent(entity, "Velocity", v => {
              v.vy = kami.diveSpeed;
              currentVy = v.vy;
          });
        }

        world.mutateComponent(entity, "Render", render => {
            render.rotation = Math.atan2(currentVy, currentVx) + Math.PI / 2;
        });

        if (pos.y > GAME_CONFIG.SCREEN_HEIGHT - 50) {
          world.mutateComponent(entity, "Kamikaze", k => {
              k.phase = "returning";
          });
        }
      } else if (kami.phase === "returning") {
        const dx = kami.originX - pos.x;
        const dy = kami.originY - pos.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < 10) {
          world.getCommandBuffer().removeComponent(entity, "Kamikaze");
          world.mutateSingleton("GameState", gs => {
              gs.kamikazesActive--;
          });
          world.mutateComponent(entity, "Velocity", v => {
              v.vx = 0;
              v.vy = 0;
          });
          world.mutateComponent(entity, "Render", render => {
              render.rotation = 0;
          });
        } else {
          world.mutateComponent(entity, "Velocity", v => {
              v.vx = (dx / dist) * (kami.diveSpeed * 0.5);
              v.vy = (dy / dist) * (kami.diveSpeed * 0.5);
          });
        }
      }
    });
  }

  private spawnKamikaze(world: World<SpaceInvadersComponentRegistry>, invaders: ReadonlyArray<number>): void {
    if (invaders.length === 0) return;
    const randomIndex = world.gameplayRandom.nextInt(0, invaders.length);
    const invader = invaders[randomIndex];
    const pos = world.getComponent(invader, "Transform");

    if (pos && !world.getComponent(invader, "Kamikaze")) {
      world.getCommandBuffer().addComponent(invader, {
        type: "Kamikaze",
        phase: "diving",
        originX: pos.x,
        originY: pos.y,
        diveSpeed: 150,
      } as KamikazeComponent);

      world.mutateComponent(invader, "Render", render => {
          render.color = "#FF4444";
      });

      world.mutateSingleton("GameState", gs => {
          gs.kamikazesActive++;
      });
    }
  }
}
