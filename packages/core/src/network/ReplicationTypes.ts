import { WorldSnapshot } from "../ecs/SnapshotTypes";

export type ReplicationStrategyType = 'full' | 'snapshot' | 'hybrid' | 'dead-reckoning';

export type InterestLevel = 'critical' | 'high' | 'medium' | 'low' | 'none';

export interface InterestedEntity {
    entityId: number | string;
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
    entityId?: number | string;
}

export interface EntityDeltaPayload {
    id: number;
    updated?: Record<string, any>;
    removed?: string[];
    components?: Record<string, any>;
    entityId?: number | string;
}

export interface DeltaPacket {
    tick: number;
    baselineTick?: number;
    stateVersion: number;
    created?: EntityPayload[];
    updated?: EntityDeltaPayload[];
    removed?: (number | string)[];
    [key: string]: any;
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
