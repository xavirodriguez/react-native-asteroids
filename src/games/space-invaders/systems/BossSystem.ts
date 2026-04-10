import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { TransformComponent, VelocityComponent, RenderComponent, Component, HealthComponent } from "../../../engine/types/EngineTypes";
import { GameStateComponent, GAME_CONFIG } from "../types/SpaceInvadersTypes";
import { createEmitter } from "../../../engine/systems/ParticleSystem";
import { Juice } from "../../../engine/utils/Juice";

export interface BossComponent extends Component {
  type: "Boss";
  hp: number;
  maxHp: number;
  timer: number;
  phase: number;
}

export class BossSystem extends System {
  public update(world: World, deltaTime: number): void {
    const gameState = world.getSingleton<GameStateComponent>("GameState");
    if (!gameState || gameState.isGameOver) return;

    const bosses = world.query("Boss", "Transform", "Render");
    bosses.forEach(entity => {
      const boss = world.getComponent<BossComponent>(entity, "Boss")!;
      const pos = world.getComponent<TransformComponent>(entity, "Transform")!;
      const render = world.getComponent<RenderComponent>(entity, "Render")!;

      boss.timer += deltaTime;

      // Simple side to side movement
      pos.x = GAME_CONFIG.SCREEN_WIDTH / 2 + Math.sin(boss.timer / 1000) * 200;

      // Phase changes
      const hpPercent = boss.hp / boss.maxHp;
      if (hpPercent < 0.33) boss.phase = 3;
      else if (hpPercent < 0.66) boss.phase = 2;
      else boss.phase = 1;

      // Shooting patterns (Placeholder: in a real implementation we would spawn bullets)
      if (Math.floor(boss.timer / 1000) % 2 === 0 && Math.floor((boss.timer - deltaTime) / 1000) % 2 !== 0) {
         // Burst effect when "shooting"
         createEmitter(world, {
            position: { x: pos.x, y: pos.y + 40 },
            rate: 0, burst: 10,
            color: ["#FF00FF", "#00FFFF"],
            size: {min:3, max:6},
            speed: {min:100, max:200},
            angle: {min:0, max:360},
            lifetime: {min:0.5, max:1.0},
            loop: false
         });
      }

      if (boss.hp <= 0) {
        this.destroyBoss(world, entity, gameState);
      }
    });

    // Spawn boss every 5 levels
    if (gameState.level > 0 && gameState.level % 5 === 0 && gameState.invadersRemaining === 0 && bosses.length === 0) {
        this.spawnBoss(world, gameState.level);
    }
  }

  private spawnBoss(world: World, level: number): void {
    const boss = world.createEntity();
    const hp = 50 + (level / 5) * 50;
    world.addComponent(boss, { type: "Transform", x: GAME_CONFIG.SCREEN_WIDTH / 2, y: 100, rotation: 0, scaleX: 1, scaleY: 1 });
    world.addComponent(boss, { type: "Render", shape: "invader", size: 80, color: "#FF00FF", rotation: 0 });
    world.addComponent(boss, { type: "Collider", radius: 40 });
    world.addComponent(boss, { type: "Boss", hp, maxHp: hp, timer: 0, phase: 1 });
    world.addComponent(boss, { type: "Health", current: hp, max: hp, invulnerableRemaining: 0 });
  }

  private destroyBoss(world: World, entity: number, gameState: GameStateComponent): void {
    const pos = world.getComponent<TransformComponent>(entity, "Transform")!;
    createEmitter(world, {
        position: { x: pos.x, y: pos.y },
        rate: 0, burst: 50,
        color: ["#FF00FF", "#FFFFFF", "#FFFF00"],
        size: {min:4, max:10},
        speed: {min:50, max:300},
        angle: {min:0, max:360},
        lifetime: {min:1.0, max:2.0},
        loop: false
    });
    Juice.shake(world, 10, 1000);
    gameState.score += 5000;
    world.removeEntity(entity);
  }
}
