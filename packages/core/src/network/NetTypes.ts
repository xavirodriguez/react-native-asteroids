import { Entity } from "../ecs/Entity";
import { WorldSnapshot } from "../ecs/SnapshotTypes";

export { Entity };

export type ReplicationStrategyType = 'full' | 'snapshot' | 'hybrid' | 'dead-reckoning';

export interface ReplicationConfig {
  strategy: ReplicationStrategyType;
  snapshotRate?: number;
  priority?: number;
  components?: string[];
  authority?: 'server' | 'client' | 'both';
  interpolationDelay?: number;
}

export interface GameNetworkAdapter {
  getReplicableEntities?: () => Entity[];
  onServerSnapshot?: (snapshot: WorldSnapshot) => void;
  onEntityDestroyed?: (entityId: string) => void;
}

export interface InputFrame {
  protocolVersion: number;
  tick: number;
  timestamp: number;
  actions: string[];
  axes: Record<string, number>;
}

export interface PredictedState {
  tick: number;
  entityId: string;
  state: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    angle?: number;
  };
  entities: string[];
}

export interface EntitySnapshot {
  tick: number;
  x: number;
  y: number;
  angle?: number;
  timestamp: number;
}

export interface ReplayFrame {
  tick: number;
  inputs: Record<string, InputFrame[]>;
  events: string[];
}

export interface ReplayData {
  version: number;
  roomId: string;
  startTick: number;
  endTick: number;
  frames: ReplayFrame[];
}

export interface DeltaPacket {
    tick: number;
    baselineTick?: number;
    stateVersion: number;
    created?: Record<number, Record<string, any>>;
    updated?: Record<number, Record<string, any>>;
    removed?: number[];
}
