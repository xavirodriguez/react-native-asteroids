import { PerformanceObserver } from "perf_hooks";
import * as v8 from "v8";

/**
 * Tracks and logs detailed statistics for Network and GC performance.
 */
export class NetworkMetricsCollector {
  // Network stats
  private totalBytesSent = 0;
  private totalTicks = 0;
  private totalSerializationMs = 0;
  private totalActiveClients = 0;
  private totalEntitiesFiltered = 0;
  private latestActiveEntities = 0;

  // Compression stats (SoA vs AoS)
  private totalSoABytes = 0;
  private totalAoSBytes = 0;
  private compressionSamplesCount = 0;

  // GC/Memory stats
  private gcPauseCount = 0;
  private gcTotalPauseMs = 0;
  private gcMaxPauseMs = 0;
  private lastHeapUsed = 0;
  private totalAllocatedBytes = 0;
  private totalFreedBytes = 0;
  private gcObserver: PerformanceObserver | null = null;

  constructor() {
    this.setupGCObserver();
    const initialMem = process.memoryUsage();
    this.lastHeapUsed = initialMem.heapUsed;
  }

  private setupGCObserver(): void {
    try {
      this.gcObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          if (entry.entryType === "gc" || entry.name === "gc") {
            this.gcPauseCount++;
            const duration = entry.duration;
            this.gcTotalPauseMs += duration;
            if (duration > this.gcMaxPauseMs) {
              this.gcMaxPauseMs = duration;
            }
          }
        }
      });
      // Start observing GC events safely
      this.gcObserver.observe({ entryTypes: ["gc"], buffered: false });
    } catch (e) {
      // Fallback if performance observer or 'gc' type is not supported in the current environment
      console.warn("[NetworkMetricsCollector] GC PerformanceObserver not supported or failed to initialize:", e);
      this.gcObserver = null;
    }
  }

  /**
   * Cleans up listeners and resources.
   */
  public destroy(): void {
    if (this.gcObserver) {
      try {
        this.gcObserver.disconnect();
      } catch (e) {
        // ignore
      }
      this.gcObserver = null;
    }
  }

  /**
   * Record metrics for a single tick.
   */
  public recordTick(
    bytes: number,
    entities: number,
    serializationMs: number,
    clients: number,
    filtered: number
  ): void {
    this.totalBytesSent += bytes;
    this.totalTicks++;
    this.totalSerializationMs += serializationMs;
    this.totalActiveClients = clients;
    this.totalEntitiesFiltered += filtered;
    this.latestActiveEntities = entities;

    // Track memory changes to calculate allocation/free rate as fallback / detailed stats
    const mem = process.memoryUsage();
    const currentHeapUsed = mem.heapUsed;
    const delta = currentHeapUsed - this.lastHeapUsed;

    if (delta > 0) {
      this.totalAllocatedBytes += delta;
    } else if (delta < 0) {
      this.totalFreedBytes += Math.abs(delta);
      // If we don't have GC PerformanceObserver active/working, we can count memory drops as GC events
      if (!this.gcObserver) {
        this.gcPauseCount++;
      }
    }
    this.lastHeapUsed = currentHeapUsed;
  }

  /**
   * Records a compression comparison sample (SoA Msgpack vs equivalent AoS JSON).
   */
  public recordCompression(soaBytes: number, aosBytes: number): void {
    if (soaBytes <= 0 || aosBytes <= 0) return;
    this.totalSoABytes += soaBytes;
    this.totalAoSBytes += aosBytes;
    this.compressionSamplesCount++;
  }

  /**
   * Generates and returns a comprehensive metrics report.
   */
  public getMetrics(): any {
    const mem = process.memoryUsage();
    const heapStats = v8.getHeapStatistics();

    const avgBytesPerTick = this.totalTicks > 0 ? this.totalBytesSent / this.totalTicks : 0;
    const avgSerializationMs = this.totalTicks > 0 ? this.totalSerializationMs / this.totalTicks : 0;
    const avgEntitiesFiltered = this.totalTicks > 0 ? this.totalEntitiesFiltered / this.totalTicks : 0;

    // Compression ratio: AoS size / SoA size (e.g. 2.5 means AoS was 2.5 times larger than SoA)
    const compressionRatio = this.totalSoABytes > 0 ? this.totalAoSBytes / this.totalSoABytes : 0;
    const percentSpaceSaved = this.totalAoSBytes > 0 ? (1 - this.totalSoABytes / this.totalAoSBytes) * 100 : 0;

    // GC pause rate: percentage of total tick time spent in GC pauses (assuming 16.67ms per tick)
    const totalSimulatedTimeMs = this.totalTicks * 16.67;
    const gcPauseRatePercent = totalSimulatedTimeMs > 0 ? (this.gcTotalPauseMs / totalSimulatedTimeMs) * 100 : 0;
    const gcPausesPer1000Ticks = this.totalTicks > 0 ? (this.gcPauseCount / this.totalTicks) * 1000 : 0;

    return {
      network: {
        totalBytesSent: this.totalBytesSent,
        totalTicks: this.totalTicks,
        avgBytesPerTick,
        avgSerializationMs,
        activeClients: this.totalActiveClients,
        avgEntitiesFiltered,
        activeEntities: this.latestActiveEntities
      },
      compression: {
        totalSoABytes: this.totalSoABytes,
        totalAoSBytes: this.totalAoSBytes,
        compressionRatio: Number(compressionRatio.toFixed(2)),
        percentSpaceSaved: Number(percentSpaceSaved.toFixed(1)) + "%",
        samplesCount: this.compressionSamplesCount
      },
      memory: {
        heapUsedBytes: mem.heapUsed,
        heapTotalBytes: mem.heapTotal,
        externalBytes: mem.external,
        rssBytes: mem.rss,
        heapLimitBytes: heapStats.heap_size_limit,
        totalAllocatedBytes: this.totalAllocatedBytes,
        totalFreedBytes: this.totalFreedBytes
      },
      gc: {
        gcPauseCount: this.gcPauseCount,
        gcTotalPauseMs: Number(this.gcTotalPauseMs.toFixed(2)),
        gcMaxPauseMs: Number(this.gcMaxPauseMs.toFixed(2)),
        gcPauseRatePercent: Number(gcPauseRatePercent.toFixed(4)) + "%",
        gcPausesPer1000Ticks: Number(gcPausesPer1000Ticks.toFixed(2))
      }
    };
  }
}
