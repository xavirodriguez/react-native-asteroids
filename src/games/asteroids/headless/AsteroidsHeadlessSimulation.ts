import { World } from "../../../engine/core/World";
import { MovementSystem } from "../../../engine/physics/systems/MovementSystem";
import { BoundarySystem } from "../../../engine/physics/systems/BoundarySystem";
import { FrictionSystem } from "../../../engine/physics/systems/FrictionSystem";
import { TTLSystem } from "../../../engine/systems/TTLSystem";
import { AsteroidCollisionSystem } from "../systems/AsteroidCollisionSystem";
import { AsteroidInputSystem } from "../systems/AsteroidInputSystem";
import { CollisionSystem2D } from "../../../engine/physics/collision/CollisionSystem2D";
import { UfoSystem } from "../systems/UfoSystem";
import { AsteroidGameStateSystem } from "../systems/AsteroidGameStateSystem";
import { AsteroidComboSystem } from "../systems/AsteroidComboSystem";
import { ShipControlSystem } from "../systems/ShipControlSystem";
import { LootSystem } from "../../../engine/systems/LootSystem";
import { PowerUpSystem } from "../../../engine/systems/PowerUpSystem";
import { ModifierSystem } from "../../../engine/systems/ModifierSystem";
import { MutatorSystem } from "../../../engine/systems/MutatorSystem";
import { SpatialPartitioningSystem } from "../../../engine/systems/SpatialPartitioningSystem";
import { EventBus } from "../../../engine/core/EventBus";
import { SpatialGrid } from "../../../engine/physics/utils/SpatialGrid";
import { RandomService } from "../../../engine/utils/RandomService";
import { BulletPool, ParticlePool } from "../EntityPool";
import { AsteroidConfig } from "../types/AsteroidConfigSchema";

/**
 * Headless simulation for Asteroids, suitable for server-side execution.
 */
export class AsteroidsHeadlessSimulation {
    private world: World;
    private eventBus: EventBus;
    private bulletPool: BulletPool;
    private particlePool: ParticlePool;

    constructor(options: { seed: number, config?: AsteroidConfig }) {
        const config = options.config || require("../config/asteroids.json");
        this.world = new World();
        this.eventBus = new EventBus();
        this.bulletPool = new BulletPool();
        this.particlePool = new ParticlePool();

        this.world.setResource("EventBus", this.eventBus);
        this.world.setResource("SpatialGrid", new SpatialGrid());

        RandomService.resetInstances();
        RandomService.getInstance("gameplay", options.seed).setSeed(options.seed);
        RandomService.getInstance("render", options.seed ^ 0xDEADBEEF).setSeed(options.seed ^ 0xDEADBEEF);

        this.world.addSystem(new AsteroidInputSystem(this.bulletPool, this.particlePool, config));
        this.world.addSystem(new ShipControlSystem(config));
        this.world.addSystem(new MovementSystem());
        this.world.addSystem(new BoundarySystem());
        this.world.addSystem(new FrictionSystem());
        this.world.addSystem(new CollisionSystem2D());
        this.world.addSystem(new AsteroidCollisionSystem(this.particlePool));
        this.world.addSystem(new AsteroidComboSystem());
        this.world.addSystem(new TTLSystem());
        this.world.addSystem(new AsteroidGameStateSystem());
        this.world.addSystem(new UfoSystem());
        this.world.addSystem(new LootSystem());
        this.world.addSystem(new PowerUpSystem());
        this.world.addSystem(new ModifierSystem());
        this.world.addSystem(new MutatorSystem([]));
        this.world.addSystem(new SpatialPartitioningSystem());
    }

    public step(deltaTimeMs: number): void {
        this.world.update(deltaTimeMs);
        this.eventBus.processDeferred();
    }

    public getWorld(): World {
        return this.world;
    }

    public getEventBus(): EventBus {
        return this.eventBus;
    }
}
