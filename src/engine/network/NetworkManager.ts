import { World } from "../core/World";
import { WorldSnapshot } from "../types/EngineTypes";
import { ReconciliationStrategy } from "./ReconciliationStrategy";
import { ReplicationConfig, GameNetworkAdapter } from "./types";
import { FullReconciliationStrategy } from "./strategies/FullReconciliation";
import { SnapshotInterpolationStrategy } from "./strategies/SnapshotInterpolation";
import { HybridAuthorityStrategy } from "./strategies/HybridAuthority";
import { INetworkGame } from "./types/NetworkTypes";
import { EntityReplicator } from "./EntityReplicator";

/**
 * Main entry point for the netcode abstraction.
 * Intended to orchestrate replication and reconciliation strategies.
 */
export class NetworkManager {
    private static instances = new Map<string, NetworkManager>();

    private replicator = new EntityReplicator();
    private strategy: ReconciliationStrategy;

    private constructor(
        private game: INetworkGame,
        private adapter: GameNetworkAdapter,
        private config: ReplicationConfig
    ) {
        this.strategy = this.createStrategy(game, config);
    }

    public static registerGame(gameId: string, game: INetworkGame, adapter: GameNetworkAdapter, config: ReplicationConfig): NetworkManager {
        const manager = new NetworkManager(game, adapter, config);
        this.instances.set(gameId, manager);
        return manager;
    }

    public static getInstance(gameId: string): NetworkManager | undefined {
        return this.instances.get(gameId);
    }

    private createStrategy(game: INetworkGame, config: ReplicationConfig): ReconciliationStrategy {
        switch (config.strategy) {
            case 'full':
                return new FullReconciliationStrategy(game, {
                    interpolationDelay: config.interpolationDelay,
                    maxHistory: 120
                });
            case 'snapshot':
                return new SnapshotInterpolationStrategy({
                    interpolationDelay: config.interpolationDelay
                });
            case 'hybrid':
                return new HybridAuthorityStrategy({
                    interpolationDelay: config.interpolationDelay
                });
            default:
                throw new Error(`Unsupported replication strategy: ${config.strategy}`);
        }
    }

    public update(world: World, deltaTime: number): void {
        this.strategy.update(world, deltaTime);
    }

    public processServerUpdate(serverTick: number, authoritativeSnapshot: WorldSnapshot, localSessionId?: string): void {
        this.strategy.processServerUpdate(serverTick, authoritativeSnapshot, localSessionId);
    }

    public getReplicator(): EntityReplicator {
        return this.replicator;
    }

    public getStrategy(): ReconciliationStrategy {
        return this.strategy;
    }

    public reset(): void {
        this.strategy.reset();
        this.replicator.clear();
    }
}
