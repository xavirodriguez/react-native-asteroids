import { Entity } from "../ecs/Entity";
<<<<<<< HEAD
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
=======

export interface InputFrame {
  tick: number;
  input: any;
>>>>>>> 93349d556c08ba34cd14983bf284c3a8e1459376
}

export interface ReplayFrame {
  tick: number;
<<<<<<< HEAD
  inputs: Record<string, InputFrame[]>;
  events: string[];
=======
  inputs: Record<Entity, any>;
  events: any[];
>>>>>>> 93349d556c08ba34cd14983bf284c3a8e1459376
}

export interface ReplayData {
  version: number;
  roomId: string;
  startTick: number;
  endTick: number;
  frames: ReplayFrame[];
}
<<<<<<< HEAD

export interface DeltaPacket {
    tick: number;
    baselineTick?: number;
    stateVersion: number;
    created?: Record<number, Record<string, any>>;
    updated?: Record<number, Record<string, any>>;
    removed?: number[];
}
=======
>>>>>>> 93349d556c08ba34cd14983bf284c3a8e1459376
