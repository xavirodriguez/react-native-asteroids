import { World } from "../ecs/World";
import { WorldSnapshot } from "../ecs/SnapshotTypes";
import { ReconciliationStrategy } from "./ReconciliationStrategy";
import { ReplicationConfig, GameNetworkAdapter } from "./NetTypes";
import { FullReconciliationStrategy } from "./strategies/FullReconciliation";
import { SnapshotInterpolationStrategy } from "./strategies/SnapshotInterpolation";
import { HybridAuthorityStrategy } from "./strategies/HybridAuthority";
import { INetworkGame } from "./NetworkTypes";
import { EntityReplicator } from "./EntityReplicator";

/**
 * Main entry point for the netcode abstraction.
 *
 * @remarks
 * The `NetworkManager` acts as a high-level controller designed to coordinate replication
 * and reconciliation. It delegates specific synchronization logic to an underlying
 * {@link ReconciliationStrategy} and serves as a bridge between the ECS {@link World}
 * and the network adapter.
 *
 * While it provides a unified interface for various strategies (rollback, interpolation),
 * synchronization quality is typically a best-effort result subject to the selected
 * strategy, network conditions (latency, jitter, packet loss), and the underlying
 * simulation's consistency.
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

    /**
     * Informs the current strategy of an incoming authoritative update from the server.
     */
    public processServerUpdate(serverTick: number, authoritativeSnapshot: WorldSnapshot, localSessionId?: string): void {
        this.strategy.processServerUpdate(serverTick, authoritativeSnapshot, localSessionId);
    }

    public getReplicator(): EntityReplicator {
        return this.replicator;
    }

    public getStrategy(): ReconciliationStrategy {
        return this.strategy;
    }

    /**
     * Resets the network state, clearing local history and replicated entities.
     */
    public reset(): void {
        this.strategy.reset();
        this.replicator.clear();
    }
}
