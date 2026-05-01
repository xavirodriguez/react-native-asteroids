import { NetworkMetricsCollector } from "../NetworkMetrics";

describe("NetworkMetricsCollector", () => {
  let collector: NetworkMetricsCollector;

  beforeEach(() => {
    collector = new NetworkMetricsCollector();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("should aggregate metrics correctly for a single tick", () => {
    collector.recordTick(100, 5, 2, 1);
    const metrics = collector.getMetrics();

    expect(metrics.avgBytesPerTick).toBe(100);
    expect(metrics.avgEntitiesPerTick).toBe(5);
    expect(metrics.avgSerializationMs).toBe(2);
    expect(metrics.avgClients).toBe(1);
    expect(metrics.peakBytesPerTick).toBe(100);
  });

  test("should calculate averages for multiple ticks", () => {
    collector.recordTick(100, 10, 2, 1);
    collector.recordTick(200, 20, 4, 3);
    const metrics = collector.getMetrics();

    expect(metrics.avgBytesPerTick).toBe(150);
    expect(metrics.avgEntitiesPerTick).toBe(15);
    expect(metrics.avgSerializationMs).toBe(3);
    expect(metrics.avgClients).toBe(2);
    expect(metrics.peakBytesPerTick).toBe(200);
  });

  test("should only keep samples within the 1-second window", () => {
    collector.recordTick(100, 10, 1, 1);

    // Advance time by 1100ms
    jest.advanceTimersByTime(1100);

    // New sample triggers cleanup of old one
    collector.recordTick(500, 50, 5, 2);

    const metrics = collector.getMetrics();
    expect(metrics.avgBytesPerTick).toBe(500);
    expect(metrics.avgEntitiesPerTick).toBe(50);
    expect(metrics.avgSerializationMs).toBe(5);
    expect(metrics.avgClients).toBe(2);
  });

  test("should track peak bytes correctly", () => {
    collector.recordTick(100, 1, 1, 1);
    collector.recordTick(500, 1, 1, 1);
    collector.recordTick(300, 1, 1, 1);

    const metrics = collector.getMetrics();
    expect(metrics.peakBytesPerTick).toBe(500);
  });
});
