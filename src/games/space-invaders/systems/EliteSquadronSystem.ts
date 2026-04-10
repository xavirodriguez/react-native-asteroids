import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { TransformComponent, HealthComponent, RenderComponent } from "../../../engine/types/EngineTypes";
import { EliteInvaderComponent, GameStateComponent, GAME_CONFIG } from "../types/SpaceInvadersTypes";

export class EliteSquadronSystem extends System {
  private spawnTimer = 5000;

  public update(world: World, deltaTime: number): void {
    const gameState = world.getSingleton<GameStateComponent>("GameState");
    if (!gameState || gameState.isGameOver) return;

    const elites = world.query("EliteInvader", "Transform");

    // Phase 3.1: Trigger elites
    if (gameState.invadersRemaining < (GAME_CONFIG.INVADER_ROWS * GAME_CONFIG.INVADER_COLS * 0.5) && elites.length === 0) {
      this.triggerElites(world);
    }

    this.spawnTimer -= deltaTime;
    if (this.spawnTimer <= 0 && elites.length > 0) {
      this.spawnTimer = 5000;
      const readyElite = elites[Math.floor(Math.random() * elites.length)];
      const eliteComp = world.getComponent<EliteInvaderComponent>(readyElite, "EliteInvader")!;
      if (eliteComp.phase === "formation") {
        eliteComp.phase = "attacking";
        const player = world.query("Player", "Transform")[0];
        if (player) {
          const playerPos = world.getComponent<TransformComponent>(player, "Transform")!;
          eliteComp.targetX = playerPos.x;
          eliteComp.targetY = GAME_CONFIG.SCREEN_HEIGHT;
        }
      }
    }

    const dtSeconds = deltaTime / 1000;
    elites.forEach((entity) => {
      const elite = world.getComponent<EliteInvaderComponent>(entity, "EliteInvader")!;
      const pos = world.getComponent<TransformComponent>(entity, "Transform")!;

      if (elite.phase === "attacking") {
        if (elite.behavior === "dive_bomb") {
          const dx = elite.targetX - pos.x;
          const dy = elite.targetY - pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 5) {
            elite.phase = "returning";
          } else {
            pos.x += (dx / dist) * 180 * dtSeconds;
            pos.y += (dy / dist) * 180 * dtSeconds;
          }
        }
      } else if (elite.phase === "returning") {
        const dx = elite.originalX - pos.x;
        const dy = elite.originalY - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 5) {
          elite.phase = "formation";
          pos.x = elite.originalX;
          pos.y = elite.originalY;
        } else {
          pos.x += (dx / dist) * 120 * dtSeconds;
          pos.y += (dy / dist) * 120 * dtSeconds;
        }
      }
    });
  }

  private triggerElites(world: World): void {
    const invaders = world.query("Invader", "Transform").slice(0, 3);
    invaders.forEach((entity) => {
      const pos = world.getComponent<TransformComponent>(entity, "Transform")!;
      world.addComponent(entity, {
        type: "EliteInvader",
        behavior: Math.random() > 0.5 ? "dive_bomb" : "strafe",
        phase: "formation",
        originalX: pos.x,
        originalY: pos.y,
        targetX: 0,
        targetY: 0,
        timer: 0
      } as EliteInvaderComponent);
      world.addComponent(entity, { type: "Health", current: GAME_CONFIG.ELITE_HP, max: GAME_CONFIG.ELITE_HP, invulnerableRemaining: 0 } as HealthComponent);
      const render = world.getComponent<RenderComponent>(entity, "Render")!;
      render.color = "#FF0000";
    });
  }
}
