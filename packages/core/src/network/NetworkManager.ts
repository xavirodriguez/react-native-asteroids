import { WorldSnapshot } from "../snapshots/WorldSnapshot";
import { NetworkTransport } from "./NetworkTransport";
import { NullTransport } from "./NullTransport";

/**
 * Coordinator for network synchronization, prediction, and state reconciliation.
 *
 * @remarks
 * This class aims to keep the local simulation in sync with a server by managing
 * input history, authoritative snapshots, and re-simulation (rollback).
 *
 * @warning
 * **Synchronization**: This system is designed for eventual consistency through state reconciliation
 * and interpolation. However, bit-identical synchronization across clients is generally not
 * expected due to network jitter, varying latencies, packet loss, and potential floating-point
 * drift across different platforms.
 * @public
 */
export class NetworkManager {
  private transport: NetworkTransport;

  constructor(transport?: NetworkTransport) {
    this.transport = transport || new NullTransport();
  }

  public static registerGame(_gameId: string, _game: any, options: any = {}): NetworkManager {
    return new NetworkManager(options.transport || new NullTransport());
  }

  public getTransport(): NetworkTransport {
    return this.transport;
  }

  public setTransport(transport: NetworkTransport): void {
    this.transport = transport;
  }

  /**
   * Compatibility stub for games expecting a replicator.
   */
  public getReplicator(): any {
    return {
        resolveEntity: (_id: string, _world: any) => 0,
        getLocalId: (_serverId: string) => undefined,
        getMappings: () => new Map(),
        removeMapping: (_serverId: string) => {}
    };
  }

  public getStrategy(): any {
    return {
      recordPrediction: (_input: any, _world: any) => {}
    };
  }

  public processServerUpdate(_tick: number, _snapshot: WorldSnapshot, _sessionId?: string): void {
    if (this.transport.isOffline) {
      return;
    }
  }
  public reset(): void {}
}

/** @public */
export interface INetworkGame {
  readonly gameId: string;
}

/** @public */
export class NetworkReplicationUtils {
  public static applyDelta(_snapshot: WorldSnapshot, _delta: any): void {}
}
