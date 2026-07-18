import { System, World, HealthComponent, EventBus, TransformComponent, RenderComponent, Component, Collider2DComponent } from "../../../index";
import { GameStateComponent, BossComponent, SpaceInvadersComponentRegistry, GAME_CONFIG } from "../types/SpaceInvadersTypes";
import { SpaceInvadersConfig } from "../types/SpaceInvadersConfigSchema";
import { createEmitter } from "../../../index";
import { CollisionLayers } from "../../shared/types/CollisionLayers";
import { Juice } from "../../../index";

export class BossSystem extends System<SpaceInvadersComponentRegistry> {
  private config?: SpaceInvadersConfig;

  public update(world: World<SpaceInvadersComponentRegistry>, deltaTime: number): void {
    if (!this.config) {
        this.config = world.getResource<SpaceInvadersConfig>("GameConfig")!;
    }
    const gameState = world.getSingleton("GameState");
    if (!gameState || gameState.isGameOver) return;

    const bosses = world.query("Boss", "Transform", "Render");
    bosses.forEach(entity => {
      const boss = world.getComponent(entity, "Boss")!;
      const pos = world.getComponent(entity, "Transform")!;

      world.mutateComponent(entity, "Boss", b => {
          b.timer += deltaTime;
      });

      // Simple side to side movement
      world.mutateComponent(entity, "Transform", p => {
          p.x = GAME_CONFIG.SCREEN_WIDTH / 2 + Math.sin(boss.timer / 1000) * 200;
      });

      // Phase changes
      world.mutateComponent(entity, "Boss", b => {
          const hpPercent = b.hp / b.maxHp;
          if (hpPercent < 0.33) b.phase = 3;
          else if (hpPercent < 0.66) b.phase = 2;
          else b.phase = 1;
      });

      // Shooting patterns
      if (Math.floor(boss.timer / 1000) % 2 === 0 && Math.floor((boss.timer - deltaTime) / 1000) % 2 !== 0) {
         // Burst effect when "shooting"
         createEmitter(world, {
            type: "shoot",
            x: pos.x,
            y: pos.y + 40,
            rate: 0,
            burst: true,
            count: 10,
            color: ["#FF00FF", "#00FFFF"],
            size: [3, 6],
            speed: [100, 200],
            angle: [0, 360],
            lifetime: [0.5, 1.0],
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

  private spawnBoss(world: World<SpaceInvadersComponentRegistry>, level: number): void {
    const commands = world.getCommandBuffer();
    const hp = 50 + (level / 5) * 50;

    const boss = world.reserveEntityId();
    commands.createEntity(boss);
    commands.addComponent(boss, { type: "Transform", x: GAME_CONFIG.SCREEN_WIDTH / 2, y: 100, rotation: 0, scaleX: 1, scaleY: 1, worldX: GAME_CONFIG.SCREEN_WIDTH / 2, worldY: 100, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false } as TransformComponent);
    commands.addComponent(boss, { type: "Render", shape: "invader", size: 80, color: "#FF00FF", rotation: 0, visible: true, opacity: 1, order: 0, hitFlashFrames: 0, angularVelocity: 0 } as RenderComponent);
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
    commands.addComponent(boss, { type: "Health", current: hp, max: hp } as HealthComponent);
  }

  private destroyBoss(world: World<SpaceInvadersComponentRegistry>, entity: number): void {
    const pos = world.getComponent(entity, "Transform")!;
    createEmitter(world, {
        type: "explosion",
        x: pos.x,
        y: pos.y,
        rate: 0,
        burst: true,
        count: 50,
        color: ["#FF00FF", "#FFFFFF", "#FFFF00"],
        size: [4, 10],
        speed: [50, 300],
        angle: [0, 360],
        lifetime: [1.0, 2.0],
        loop: false
    });
    Juice.shake(world, 10, 1000);

    world.mutateSingleton("GameState", gs => {
        gs.score += 5000;
    });

    const eventBus = world.getResource<EventBus>("EventBus");
    if (eventBus) eventBus.emitDeferred("si:boss_defeated" as any, {} as any);

    world.getCommandBuffer().removeEntity(entity);
  }
}
