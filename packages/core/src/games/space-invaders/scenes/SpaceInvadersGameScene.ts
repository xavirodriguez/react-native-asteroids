import { Scene } from "../../../scenes/Scene";
import { World } from "../../../ecs/World";
import { EventBus } from "../../../events/EventBus";
import { BaseGame } from "../../../runtime/BaseGame";
import { SpaceInvadersComponentRegistry } from "../types/SpaceInvadersTypes";
import { MovementSystem } from "../../../physics/systems/MovementSystem";
import { ComboSystem } from "../../arcade/systems/ComboSystem";
import { TTLSystem } from "../../../systems/TTLSystem";
import { JuiceSystem } from "../../../systems/JuiceSystem";
import { RenderUpdateSystem } from "../../../systems/RenderUpdateSystem";
import { SpaceInvadersInputSystem } from "../systems/SpaceInvadersInputSystem";
import { BoundarySystem } from "../../../physics/systems/BoundarySystem";
import { SpaceInvadersFormationSystem } from "../systems/SpaceInvadersFormationSystem";
import { SpaceInvadersCollisionSystem } from "../systems/SpaceInvadersCollisionSystem";
import { SpaceInvadersGameStateSystem } from "../systems/SpaceInvadersGameStateSystem";
import { CollisionSystem2D } from "../../../physics/collision/CollisionSystems";
import { SpaceInvadersRenderSystem } from "../systems/SpaceInvadersRenderSystem";
import { InvulnerabilitySystem } from "../systems/InvulnerabilitySystem";
import { KamikazeSystem } from "../systems/KamikazeSystem";
import { BossSystem } from "../systems/BossSystem";
import { LootSystem } from "../../arcade/systems/LootSystem";
import { PowerUpSystem } from "../../arcade/systems/PowerUpSystem";
import { PlayerBulletPool, EnemyBulletPool, ParticlePool } from "../EntityPool";
import {
  createPlayer,
  createGameState,
  createFormationController,
  spawnInvaderWave,
  spawnShields
} from "../EntityFactory";
import { SpaceInvadersConfig } from "../types/SpaceInvadersConfigSchema";
import { GAME_CONFIG } from "../types/SpaceInvadersTypes";
import { ISpaceInvadersGame } from "../types/GameInterfaces";
import { MutatorSystem } from "../../../systems/MutatorSystem";
import { SystemPhase } from "../../../ecs/System";

/**
 * Main gameplay scene for Space Invaders.
 */
export class SpaceInvadersGameScene extends Scene {
  private game: ISpaceInvadersGame;
  private playerBulletPool: PlayerBulletPool;
  private enemyBulletPool: EnemyBulletPool;
  private particlePool: ParticlePool;
  private config: SpaceInvadersConfig;

  constructor(
    game: ISpaceInvadersGame,
    playerBulletPool: PlayerBulletPool,
    enemyBulletPool: EnemyBulletPool,
    particlePool: ParticlePool,
    config?: SpaceInvadersConfig
  ) {
    // Note: in this engine, Scene creates its own World if not provided
    // but the constructor requires a World.
    const world = new World<SpaceInvadersComponentRegistry>();
    super(world);
    this.game = game;
    this.playerBulletPool = playerBulletPool;
    this.enemyBulletPool = enemyBulletPool;
    this.particlePool = particlePool;
    this.config = config || world.getResource<SpaceInvadersConfig>("GameConfig")!;
  }

  public onEnter(): void {
    // Inject resources into the scene world
    this.world.setResource("GameConfig", this.config);
    const eventBus = (this.game as unknown as { eventBus: EventBus }).eventBus;
    if (eventBus) {
      this.world.setResource("EventBus", eventBus);
    }

    // 1. Systems registration
    const inputSys = new SpaceInvadersInputSystem(this.playerBulletPool);
    if (this.game.isMultiplayer) inputSys.setMultiplayerMode(true);

    this.world.addSystem((this.game as any).unifiedInput, { phase: SystemPhase.Input });
    this.world.addSystem(inputSys, { phase: SystemPhase.Simulation });
    this.world.addSystem(new MovementSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new ComboSystem() as any, { phase: SystemPhase.Simulation });
    this.world.addSystem(new BoundarySystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new SpaceInvadersFormationSystem(this.enemyBulletPool), { phase: SystemPhase.Simulation });
    this.world.addSystem(new InvulnerabilitySystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new CollisionSystem2D(), { phase: SystemPhase.Collision });
    this.world.addSystem(new SpaceInvadersCollisionSystem(this.particlePool), { phase: SystemPhase.GameRules });
    this.world.addSystem(new KamikazeSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new BossSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new LootSystem() as any, { phase: SystemPhase.GameRules });
    this.world.addSystem(new PowerUpSystem() as any, { phase: SystemPhase.Simulation });
    this.world.addSystem(new TTLSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new SpaceInvadersGameStateSystem(this.game), { phase: SystemPhase.GameRules });

    const mutators = (this.game as any)._config.gameOptions?.mutators || (this.game as any)._config.gameOptions?.activeMutators || [];
    this.world.addSystem(new MutatorSystem(mutators), { phase: SystemPhase.Simulation });

    // Visual / Presentation Systems
    this.world.addSystem(new JuiceSystem(), { phase: SystemPhase.Presentation });
    this.world.addSystem(new RenderUpdateSystem(), { phase: SystemPhase.Presentation }); // No trails
    this.world.addSystem(new SpaceInvadersRenderSystem(), { phase: SystemPhase.Presentation });

    // 2. Initial entities
    if (this.game.isMultiplayer) return; // Wait for server state
    createGameState(this.world);
    createPlayer(this.world, GAME_CONFIG.SCREEN_CENTER_X, GAME_CONFIG.SCREEN_HEIGHT - 50);
    createFormationController(this.world);
    spawnInvaderWave(this.world, 1);
    spawnShields(this.world);
  }
}
