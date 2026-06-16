import { WorldSnapshot } from "../ecs/SnapshotTypes";

export class NetworkManager {
  public static registerGame(gameId: string, game: any, options: any): NetworkManager {
    return new NetworkManager();
  }

  public getStrategy(): any {
    return {
      recordPrediction: (input: any, world: any) => {}
    };
  }

  public processServerUpdate(tick: number, snapshot: WorldSnapshot, localSessionId?: string): void {}
  public reset(): void {}
}

export interface INetworkGame {
  readonly gameId: string;
}

export class NetworkReplicationUtils {
  public static applyDelta(snapshot: WorldSnapshot, delta: any): void {}
}
