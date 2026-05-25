/**
 * Shared context for simulation ticks.
 */
export interface SimulationContext {
  /** True if this is a resimulation (rollback) tick. */
  isResimulating: boolean;
}
