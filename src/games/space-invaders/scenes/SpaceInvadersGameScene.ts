import { Scene, World, EventBus, BaseGame } from "@tiny-aster/core";
import { MovementSystem } from "@tiny-aster/core";
import { TTLSystem } from "@tiny-aster/core";
import { JuiceSystem } from "@tiny-aster/core";
import { RenderUpdateSystem } from "@tiny-aster/core";
import { SpaceInvadersInputSystem } from "../systems/SpaceInvadersInputSystem";
import { BoundarySystem } from "@tiny-aster/core";
import { SpaceInvadersFormationSystem } from "../systems/SpaceInvadersFormationSystem";
import { SpaceInvadersCollisionSystem } from "../systems/SpaceInvadersCollisionSystem";
import { SpaceInvadersGameStateSystem } from "../systems/SpaceInvadersGameStateSystem";
import { CollisionSystem2D } from "@tiny-aster/core";
import { SpaceInvadersRenderSystem } from "../systems/SpaceInvadersRenderSystem";
import { InvulnerabilitySystem } from "../systems/InvulnerabilitySystem";
import { KamikazeSystem } from "../systems/KamikazeSystem";
import { BossSystem } from "../systems/BossSystem";
import { LootSystem } from "@tiny-aster/core";
import { PowerUpSystem } from "@tiny-aster/core";
import { PlayerBulletPool, EnemyBulletPool, ParticlePool } from "../EntityPool";
import {
  createPlayer,
  createGameState,
  createFormationController,
  spawnInvaderWave,
  spawnShields
} from "../EntityFactory";
import { SpaceInvadersConfig } from "../types/SpaceInvadersConfigSchema";
import { ISpaceInvadersGame } from "../types/GameInterfaces";
import { MutatorSystem } from "@tiny-aster/core";
import { MutatorService } from "../../../services/MutatorService";
import { SystemPhase } from "@tiny-aster/core";

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
    const world = new World();
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

    this.world.addSystem((this.game as unknown as BaseGame<unknown, Record<string, unknown>>).unifiedInput, { phase: SystemPhase.Input });
    this.world.addSystem(inputSys, { phase: SystemPhase.Simulation });
    this.world.addSystem(new MovementSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new BoundarySystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new SpaceInvadersFormationSystem(this.enemyBulletPool), { phase: SystemPhase.Simulation });
    this.world.addSystem(new InvulnerabilitySystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new CollisionSystem2D(), { phase: SystemPhase.Collision });
    this.world.addSystem(new SpaceInvadersCollisionSystem(this.particlePool), { phase: SystemPhase.GameRules });
    this.world.addSystem(new KamikazeSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new BossSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new LootSystem(), { phase: SystemPhase.GameRules });
    this.world.addSystem(new PowerUpSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new TTLSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new SpaceInvadersGameStateSystem(this.game), { phase: SystemPhase.GameRules });

    const activeMutators = MutatorService.getActiveMutatorsForGame(this.game.gameId);
    this.world.addSystem(new MutatorSystem(activeMutators), { phase: SystemPhase.Simulation });

    // Visual / Presentation Systems
    this.world.addSystem(new JuiceSystem(), { phase: SystemPhase.Presentation });
    this.world.addSystem(new RenderUpdateSystem(0), { phase: SystemPhase.Presentation }); // No trails
    this.world.addSystem(new SpaceInvadersRenderSystem(), { phase: SystemPhase.Presentation });

    // 2. Initial entities
    if (this.game.isMultiplayer) return; // Wait for server state
    createGameState(this.world);
    createPlayer(this.world, this.config.SCREEN_CENTER_X, this.config.SCREEN_HEIGHT - 50);
    createFormationController(this.world);
    spawnInvaderWave(this.world, 1);
    spawnShields(this.world);
  }
}
