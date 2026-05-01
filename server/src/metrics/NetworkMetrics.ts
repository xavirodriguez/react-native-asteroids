/**
 * @responsibility Collect and aggregate network performance metrics per tick.
 * @remarks
 * This class maintains a rolling window of samples to calculate averages and peaks.
 * It is used to identify bandwidth and serialization bottlenecks.
 *
 * @conceptualRisk [OVERHEAD][LOW] Measuring every tick adds minimal overhead compared to JSON serialization.
 */
export interface TickSample {
  bytes: number;
  entities: number;
  serializationMs: number;
  clients: number;
  timestamp: number;
}

export class NetworkMetricsCollector {
  private samples: TickSample[] = [];
  private lastLogTime = Date.now();

  private currentMetrics = {
    avgBytesPerTick: 0,
    avgEntitiesPerTick: 0,
    avgSerializationMs: 0,
    peakBytesPerTick: 0,
    avgClients: 0,
  };

  /**
   * Records a new tick's metrics and updates internal aggregations.
   * @param bytes Size of the serialized state in bytes.
   * @param entities Number of entities included in the state.
   * @param serializationMs Time taken to serialize the state in milliseconds.
   * @param clients Number of connected clients.
   */
  public recordTick(bytes: number, entities: number, serializationMs: number, clients: number): void {
    const now = Date.now();
    this.samples.push({ bytes, entities, serializationMs, clients, timestamp: now });

    this.cleanupOldSamples(now);
    this.updateMetrics();

    if (now - this.lastLogTime >= 5000) {
      this.logSummary();
      this.lastLogTime = now;
    }
  }

  private cleanupOldSamples(now: number): void {
    const windowMs = 1000;
    while (this.samples.length > 0 && now - this.samples[0].timestamp > windowMs) {
      this.samples.shift();
    }
  }

  private updateMetrics(): void {
    if (this.samples.length === 0) {
      this.currentMetrics = {
        avgBytesPerTick: 0,
        avgEntitiesPerTick: 0,
        avgSerializationMs: 0,
        peakBytesPerTick: 0,
        avgClients: 0,
      };
      return;
    }

    let totalBytes = 0;
    let totalEntities = 0;
    let totalMs = 0;
    let totalClients = 0;
    let peak = 0;

    for (const sample of this.samples) {
      totalBytes += sample.bytes;
      totalEntities += sample.entities;
      totalMs += sample.serializationMs;
      totalClients += sample.clients;
      if (sample.bytes > peak) peak = sample.bytes;
    }

    this.currentMetrics = {
      avgBytesPerTick: totalBytes / this.samples.length,
      avgEntitiesPerTick: totalEntities / this.samples.length,
      avgSerializationMs: totalMs / this.samples.length,
      peakBytesPerTick: peak,
      avgClients: totalClients / this.samples.length,
    };
  }

  private logSummary(): void {
    console.log(
      `[NetworkMetrics] 1s-Window - Avg: ${this.currentMetrics.avgBytesPerTick.toFixed(0)} B/tick, ` +
      `${this.currentMetrics.avgEntitiesPerTick.toFixed(1)} ent/tick, ` +
      `${this.currentMetrics.avgSerializationMs.toFixed(2)} ms/ser, ` +
      `${this.currentMetrics.avgClients.toFixed(1)} clients | ` +
      `Peak: ${this.currentMetrics.peakBytesPerTick} B`
    );
  }

  /**
   * Returns the current aggregated metrics for the last 1 second.
   */
  public getMetrics() {
    return { ...this.currentMetrics };
  }
}
