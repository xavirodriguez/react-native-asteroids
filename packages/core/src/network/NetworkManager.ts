import { WorldSnapshot } from "../snapshots/WorldSnapshot";

/**
 * Coordinator for network synchronization, prediction, and state reconciliation.
 *
 * @remarks
 * This class aims to keep the local simulation in sync with a server by managing
 * input history, authoritative snapshots, and re-simulation (rollback).
 *
 * @warning
 * **Synchronization Guarantees**: Perfect synchronization is not guaranteed due to
 * network jitter, packet loss, and floating-point differences. The system aims for
 * "eventual consistency" through state reconciliation and interpolation.
 */
export class NetworkManager {
  public static registerGame(gameId: string, game: any, options: any): NetworkManager {
    return new NetworkManager();
  }

  public getStrategy(): any {
    return {
      recordPrediction: (input: any, world: any) => {}
    };
  }

  public processServerUpdate(tick: number, snapshot: WorldSnapshot, sessionId?: string): void {}
  public reset(): void {}
}

export interface INetworkGame {
  readonly gameId: string;
}

export class NetworkReplicationUtils {
  public static applyDelta(snapshot: WorldSnapshot, delta: any): void {}
}
