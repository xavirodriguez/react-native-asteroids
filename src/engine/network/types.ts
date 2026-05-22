import { Entity, WorldSnapshot } from "../types/EngineTypes";

export type ReplicationStrategyType = 'full' | 'snapshot' | 'hybrid' | 'dead-reckoning';

export interface ReplicationConfig {
  strategy: ReplicationStrategyType;
  snapshotRate?: number;      // ms entre snapshots
  priority?: number;          // 1 = crítico (nave), 10 = bajo (partículas)
  components?: string[];      // Componentes que se sincronizan
  authority?: 'server' | 'client' | 'both';
  interpolationDelay?: number;
}

export interface GameNetworkAdapter {
  getReplicableEntities?: () => Entity[];
  onServerSnapshot?: (snapshot: WorldSnapshot) => void;
  onEntityDestroyed?: (entityId: string) => void;
}
