export interface WorldSnapshot {
  entities: number[];
  componentData: ComponentDataSnapshot;
  nextEntityId: number;
  freeEntities: number[];
  structureVersion: number;
  stateVersion: number;
  seed: number;
  rngState?: number;
  tick: number;
}

export type ComponentDataSnapshot = Record<string, Record<number, SerializedComponent>>;

export type SerializedComponent = Record<string, any>;
