import { Entity } from "../ecs/Entity";
import { WorldSnapshot } from "../ecs/SnapshotTypes";

export type ReplicationStrategyType = 'full' | 'snapshot' | 'hybrid' | 'dead-reckoning';

export type InterestLevel = 'critical' | 'high' | 'medium' | 'low' | 'none';

export interface InterestedEntity {
    entityId: string;
    interestLevel: InterestLevel;
    distance: number;
}

export interface ReplicationConfig {
  strategy: ReplicationStrategyType;
  snapshotRate?: number;
  priority?: number;
  components?: string[];
  authority?: 'server' | 'client' | 'both';
  interpolationDelay?: number;
}

export interface EntityPayload {
    id: number;
    components: Record<string, any>;
}

export interface EntityDeltaPayload {
    id: number;
    updated?: Record<string, any>;
    removed?: string[];
}

export interface DeltaPacket {
    tick: number;
    baselineTick?: number;
    stateVersion: number;
    created?: EntityPayload[];
    updated?: EntityDeltaPayload[];
    removed?: number[];
}

export interface ClientNetworkBudget {
    sessionId: string;
    totalBytes: number;
    interestLevel: InterestLevel;
    maxBytesPerPacket: number;
    maxEntitiesPerPacket: number;
    maxCriticalPerTick: number;
    maxLowPriorityPerSecond: number;
}
