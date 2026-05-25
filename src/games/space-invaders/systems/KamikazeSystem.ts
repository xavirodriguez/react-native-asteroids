import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { TransformComponent, VelocityComponent, RenderComponent, Component } from "../../../engine/types/EngineTypes";
import { RandomService } from "../../../engine/utils/RandomService";
import { GameStateComponent } from "../types/SpaceInvadersTypes";
import { SpaceInvadersConfig } from "../types/SpaceInvadersConfigSchema";

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
  private config?: SpaceInvadersConfig;

  public update(world: World, deltaTime: number): void {
    if (!this.config) {
        this.config = world.getResource<SpaceInvadersConfig>("GameConfig")!;
    }
    const gameState = world.getSingleton<GameStateComponent>("GameState");
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
    const playerPos = players.length > 0 ? world.getComponent<TransformComponent>(players[0], "Transform") : null;

    kamikazes.forEach(entity => {
      const kami = world.getComponent<KamikazeComponent>(entity, "Kamikaze")!;
      const pos = world.getComponent<TransformComponent>(entity, "Transform")!;

      if (kami.phase === "diving") {
        let currentVx = 0;
        let currentVy = 0;

        if (playerPos) {
          const dx = playerPos.x - pos.x;
          const dy = playerPos.y - pos.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          world.mutateComponent<VelocityComponent>(entity, "Velocity", v => {
              v.dx = (dx / dist) * kami.diveSpeed;
              v.dy = (dy / dist) * kami.diveSpeed;
              currentVx = v.dx;
              currentVy = v.dy;
          });
        } else {
          world.mutateComponent<VelocityComponent>(entity, "Velocity", v => {
              v.dy = kami.diveSpeed;
              currentVy = v.dy;
          });
        }

        world.mutateComponent<RenderComponent>(entity, "Render", render => {
            render.rotation = Math.atan2(currentVy, currentVx) + Math.PI / 2;
        });

        if (pos.y > this.config.SCREEN_HEIGHT - 50) {
          world.mutateComponent<KamikazeComponent>(entity, "Kamikaze", k => {
              k.phase = "returning";
          });
        }
      } else if (kami.phase === "returning") {
        const dx = kami.originX - pos.x;
        const dy = kami.originY - pos.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < 10) {
          world.getCommandBuffer().removeComponent(entity, "Kamikaze");
          world.mutateSingleton<GameStateComponent>("GameState", gs => {
              gs.kamikazesActive--;
          });
          world.mutateComponent<VelocityComponent>(entity, "Velocity", v => {
              v.dx = 0;
              v.dy = 0;
          });
          world.mutateComponent<RenderComponent>(entity, "Render", render => {
              render.rotation = 0;
          });
        } else {
          world.mutateComponent<VelocityComponent>(entity, "Velocity", v => {
              v.dx = (dx / dist) * (kami.diveSpeed * 0.5);
              v.dy = (dy / dist) * (kami.diveSpeed * 0.5);
          });
        }
      }
    });
  }

  private spawnKamikaze(world: World, invaders: ReadonlyArray<number>): void {
    if (invaders.length === 0) return;
    const randomIndex = world.gameplayRandom.nextInt(0, invaders.length);
    const invader = invaders[randomIndex];
    const pos = world.getComponent<TransformComponent>(invader, "Transform");

    if (pos && !world.getComponent(invader, "Kamikaze")) {
      world.getCommandBuffer().addComponent(invader, {
        type: "Kamikaze",
        phase: "diving",
        originX: pos.x,
        originY: pos.y,
        diveSpeed: 150,
      } as KamikazeComponent);

      world.mutateComponent<RenderComponent>(invader, "Render", render => {
          render.color = "#FF4444";
      });

      world.mutateSingleton<GameStateComponent>("GameState", gs => {
          gs.kamikazesActive++;
      });
    }
  }
}
