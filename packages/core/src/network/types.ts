import { InterestLevel } from "./ReplicationTypes";

export interface EntityPayload {
    id: number;
    components: Record<string, any>;
}

export interface EntityDeltaPayload {
    id: number;
    updated?: Record<string, any>;
    removed?: string[];
    components?: Record<string, any>;
}

export interface ClientNetworkBudget {
    sessionId?: string;
    totalBytes?: number;
    interestLevel?: InterestLevel;
    maxBytesPerPacket: number;
    maxEntitiesPerPacket: number;
    maxCriticalPerTick: number;
    maxLowPriorityPerSecond: number;
}
