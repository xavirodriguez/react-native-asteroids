import { NetworkMetricsCollector } from "../NetworkMetrics";

describe("NetworkMetricsCollector", () => {
  let collector: NetworkMetricsCollector;

  beforeEach(() => {
    collector = new NetworkMetricsCollector();
  });

  afterEach(() => {
    if (collector) {
      collector.destroy();
    }
  });

  it("should initialize with default empty/zero values", () => {
    const metrics = collector.getMetrics();
    expect(metrics.network).toBeDefined();
    expect(metrics.network.totalBytesSent).toBe(0);
    expect(metrics.network.totalTicks).toBe(0);
    expect(metrics.network.avgBytesPerTick).toBe(0);
    expect(metrics.compression).toBeDefined();
    expect(metrics.compression.compressionRatio).toBe(0);
    expect(metrics.compression.percentSpaceSaved).toBe("0%");
    expect(metrics.memory).toBeDefined();
    expect(metrics.memory.heapUsedBytes).toBeGreaterThan(0);
    expect(metrics.gc).toBeDefined();
    expect(metrics.gc.gcPauseCount).toBeDefined();
  });

  it("should record ticks and compute averages correctly", () => {
    collector.recordTick(100, 5, 2.5, 2, 3);
    collector.recordTick(200, 10, 1.5, 2, 5);

    const metrics = collector.getMetrics();
    expect(metrics.network.totalBytesSent).toBe(300);
    expect(metrics.network.totalTicks).toBe(2);
    expect(metrics.network.avgBytesPerTick).toBe(150);
    expect(metrics.network.avgSerializationMs).toBe(2); // (2.5 + 1.5) / 2
    expect(metrics.network.avgEntitiesFiltered).toBe(4); // (3 + 5) / 2
    expect(metrics.network.activeClients).toBe(2);
    expect(metrics.network.activeEntities).toBe(10); // latest
  });

  it("should record SoA vs AoS compression and calculate ratio correctly", () => {
    // AoS size: 1000 bytes, SoA binary size: 400 bytes
    collector.recordCompression(400, 1000);

    const metrics = collector.getMetrics();
    expect(metrics.compression.totalSoABytes).toBe(400);
    expect(metrics.compression.totalAoSBytes).toBe(1000);
    expect(metrics.compression.compressionRatio).toBe(2.5); // 1000 / 400
    expect(metrics.compression.percentSpaceSaved).toBe("60%"); // (1 - 400/1000) * 100
    expect(metrics.compression.samplesCount).toBe(1);
  });

  it("should handle multiple compression samples", () => {
    collector.recordCompression(200, 500);
    collector.recordCompression(100, 400);

    const metrics = collector.getMetrics();
    expect(metrics.compression.totalSoABytes).toBe(300);
    expect(metrics.compression.totalAoSBytes).toBe(900);
    expect(metrics.compression.compressionRatio).toBe(3); // 900 / 300
    expect(metrics.compression.percentSpaceSaved).toBe("66.7%");
    expect(metrics.compression.samplesCount).toBe(2);
  });

  it("should safely dispose resources on destroy", () => {
    expect(() => collector.destroy()).not.toThrow();
  });
});
