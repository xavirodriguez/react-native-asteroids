import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { TransformComponent, RenderComponent, Component, Collider2DComponent } from "../../../engine/types/EngineTypes";
import { GameStateComponent, GAME_CONFIG } from "../types/SpaceInvadersTypes";
import { createEmitter } from "../../../engine/systems/ParticleSystem";
import { CollisionLayers } from "../../../engine/physics/collision/CollisionLayers";
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

      world.mutateComponent<BossComponent>(entity, "Boss", b => {
          b.timer += deltaTime;
      });

      // Simple side to side movement
      world.mutateComponent<TransformComponent>(entity, "Transform", p => {
          p.x = GAME_CONFIG.SCREEN_WIDTH / 2 + Math.sin(boss.timer / 1000) * 200;
      });

      // Phase changes
      world.mutateComponent<BossComponent>(entity, "Boss", b => {
          const hpPercent = b.hp / b.maxHp;
          if (hpPercent < 0.33) b.phase = 3;
          else if (hpPercent < 0.66) b.phase = 2;
          else b.phase = 1;
      });

      // Shooting patterns
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
        this.destroyBoss(world, entity);
      }
    });

    // Spawn boss every 5 levels
    if (gameState.level > 0 && gameState.level % 5 === 0 && gameState.invadersRemaining === 0 && bosses.length === 0) {
        this.spawnBoss(world, gameState.level);
    }
  }

  private spawnBoss(world: World, level: number): void {
    const commands = world.getCommandBuffer();
    const hp = 50 + (level / 5) * 50;
    
    commands.createEntity(boss => {
        commands.addComponent(boss, { type: "Transform", x: GAME_CONFIG.SCREEN_WIDTH / 2, y: 100, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
        commands.addComponent(boss, { type: "Render", shape: "invader", size: 80, color: "#FF00FF", rotation: 0 } as RenderComponent);
        commands.addComponent(boss, {
          type: "Collider2D",
          shape: { type: "circle", radius: 40 },
          layer: CollisionLayers.ENEMY,
          mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE,
          offsetX: 0,
          offsetY: 0,
          isTrigger: false,
          enabled: true
        } as Collider2DComponent);
        commands.addComponent(boss, { type: "Boss", hp, maxHp: hp, timer: 0, phase: 1 } as BossComponent);
        commands.addComponent(boss, { type: "Health", current: hp, max: hp, invulnerableRemaining: 0 } as import("../../../engine/types/EngineTypes").HealthComponent);
    });
  }

  private destroyBoss(world: World, entity: number): void {
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
    
    world.mutateSingleton<GameStateComponent>("GameState", gs => {
        gs.score += 5000;
    });

    const eventBus = world.getResource<import("../../../engine/core/EventBus").EventBus>("EventBus");
    if (eventBus) eventBus.emitDeferred("si:boss_defeated");
    
    world.getCommandBuffer().removeEntity(entity);
  }
}
