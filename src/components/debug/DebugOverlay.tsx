import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  Platform,
  Alert,
  Clipboard,
  ActivityIndicator
} from 'react-native';
import { BaseGame } from "@tiny-aster/core";
import type { EventLogEntry, FrameStats, ColliderShapeInfo } from "@tiny-aster/core";
import Svg, { Circle, Rect } from 'react-native-svg';

interface DebugOverlayProps {
  game: BaseGame<any, any> | null;
  room?: any;
}

type TabType = 'Frame' | 'Systems' | 'Entities' | 'Events' | 'Colliders' | 'Replay' | 'Metrics';

/**
 * DebugOverlay component that renders a floating panel with real-time engine metrics.
 * Designed to be tree-shakeable and only active in development environments.
 */
interface GameWithDebug {
  debugManager?: {
    getFrameStats(): FrameStats;
    getSystemTimings(): Record<string, number>;
    getEntitySnapshot(): Array<{ id: number; components: Record<string, unknown> }>;
    getEventLog(): EventLogEntry[];
    getColliderShapes(): ColliderShapeInfo[];
    clearEventLog(): void;
  };
  replayRecorder?: {
    stopRecording(): unknown;
    startRecording(): void;
  };
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({ game, room }) => {
  const debugManager = (game as unknown as GameWithDebug)?.debugManager;
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('Frame');
  const [_lastUpdate, setLastUpdate] = useState(0);

  // Data states
  const [frameStats, setFrameStats] = useState<FrameStats | null>(null);
  const [systemTimings, setSystemTimings] = useState<Record<string, number>>({});
  const [entities, setEntities] = useState<Array<{ id: number; components: Record<string, unknown> }>>([]);
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
  const [colliders, setColliders] = useState<ColliderShapeInfo[]>([]);
  const [showCollidersOverlay, setShowCollidersOverlay] = useState(false);
  const [entityFilter, setEntityFilter] = useState('');

  // Telemetry states
  const [metrics, setMetrics] = useState<any>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const lastRequestTimeRef = useRef<number>(0);

  // Update loop for Telemetry Metrics
  useEffect(() => {
    if (!room || !isOpen || activeTab !== 'Metrics') return;

    const handleMetrics = (data: any) => {
      setMetrics(data);
      if (lastRequestTimeRef.current > 0) {
        setLatency(Date.now() - lastRequestTimeRef.current);
      }
    };

    let listener: any = null;
    try {
      listener = room.onMessage("metrics", handleMetrics);
    } catch (e) {
      console.warn("[DebugOverlay] Failed to register metrics message handler:", e);
    }

    // Request metrics immediately
    lastRequestTimeRef.current = Date.now();
    try {
      room.send("metrics");
    } catch (e) {
      console.warn("[DebugOverlay] Failed to send metrics request:", e);
    }

    // Poll every 2 seconds
    const interval = setInterval(() => {
      lastRequestTimeRef.current = Date.now();
      try {
        room.send("metrics");
      } catch (e) {
        // Ignore send errors if connection is closed/closing
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      if (listener) {
        try {
          if (typeof listener === "function") {
            listener();
          } else if (typeof listener.clear === "function") {
            listener.clear();
          }
        } catch (e) {
          // ignore
        }
      }
    };
  }, [room, isOpen, activeTab]);

  // Update loop throttled to 10 FPS (100ms interval) to minimize performance impact
  useEffect(() => {
    if (!debugManager || (!isOpen && !showCollidersOverlay)) return;

    const interval = setInterval(() => {
      if (isOpen) {
        setFrameStats(debugManager.getFrameStats());
        setSystemTimings(debugManager.getSystemTimings());
        setEntities(debugManager.getEntitySnapshot());
        setEventLog(debugManager.getEventLog());
      }

      if (showCollidersOverlay || (isOpen && activeTab === 'Colliders')) {
        setColliders(debugManager.getColliderShapes());
      }

      setLastUpdate(Date.now());
    }, 100);

    return () => clearInterval(interval);
  }, [debugManager, isOpen, activeTab, showCollidersOverlay]);

  if (!__DEV__) return null;
  if (!game || !debugManager) return null;

  const renderTabButton = (tab: TabType) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[styles.tabButtonText, activeTab === tab && styles.activeTabButtonText]}>
        {tab}
      </Text>
    </TouchableOpacity>
  );

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderMetricsTab = () => {
    if (!room) {
      return (
        <View style={styles.tabContent}>
          <Text style={styles.statText}>Telemetría Fuera de Línea</Text>
          <Text style={styles.statLabel}>
            La telemetría en tiempo real y el análisis de Garbage Collection están disponibles únicamente en el modo multijugador activo.
          </Text>
          <Text style={[styles.statLabel, { marginTop: 15, color: '#00ff00', lineHeight: 18 }]}>
            Inicie una sesión "MULTI" desde el menú principal para conectar con el servidor Colyseus y visualizar las métricas de red, GC, compresión SoA vs AoS y memoria del heap.
          </Text>
        </View>
      );
    }

    if (!metrics) {
      return (
        <View style={styles.tabContent}>
          <ActivityIndicator size="small" color="#00ff00" style={{ marginVertical: 20 }} />
          <Text style={[styles.statLabel, { textAlign: 'center' }]}>
            Conectando con el endpoint de telemetría de Colyseus...
          </Text>
        </View>
      );
    }

    // Network stats
    const net = metrics.network || {};
    const compression = metrics.compression || {};
    const mem = metrics.memory || {};
    const gc = metrics.gc || {};

    // Calculate latency indicator color
    let latencyColor = '#00ff00';
    if (latency !== null) {
      if (latency > 200) latencyColor = '#ff4444';
      else if (latency > 100) latencyColor = '#ffbb00';
    }

    // Space saved visual percentage
    let spaceSavedVal = 0;
    if (typeof compression.percentSpaceSaved === 'string') {
      spaceSavedVal = parseFloat(compression.percentSpaceSaved) || 0;
    } else if (typeof compression.percentSpaceSaved === 'number') {
      spaceSavedVal = compression.percentSpaceSaved;
    }

    // Memory usage percentage
    const heapUsed = mem.heapUsedBytes || 0;
    const heapTotal = mem.heapTotalBytes || 0;
    const heapPercent = heapTotal > 0 ? (heapUsed / heapTotal) * 100 : 0;

    return (
      <ScrollView style={styles.tabContent} contentContainerStyle={{ paddingBottom: 30 }}>
        {/* NETWORK & LATENCY SECTION */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>📡 Latencia y Red</Text>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Latencia RTT (Cliente-Servidor):</Text>
            <Text style={[styles.metricValue, { color: latencyColor, fontWeight: 'bold' }]}>
              {latency !== null ? `${latency} ms` : 'Estimando...'}
            </Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Clientes Conectados:</Text>
            <Text style={styles.metricValue}>{net.activeClients ?? 1}</Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Entidades Activas:</Text>
            <Text style={styles.metricValue}>{net.activeEntities ?? 0}</Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Velocidad de Transferencia (Avg):</Text>
            <Text style={styles.metricValue}>{formatBytes(net.avgBytesPerTick ?? 0)} / tick</Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Transferencia Total:</Text>
            <Text style={styles.metricValue}>{formatBytes(net.totalBytesSent ?? 0)} ({net.totalTicks ?? 0} ticks)</Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Culling Espacial (Descartados Avg):</Text>
            <Text style={styles.metricValue}>{Number(net.avgEntitiesFiltered ?? 0).toFixed(1)} / tick</Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Tiempo de Serialización (Avg):</Text>
            <Text style={styles.metricValue}>{Number(net.avgSerializationMs ?? 0).toFixed(3)} ms</Text>
          </View>
        </View>

        {/* COMPRESSION SECTION */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>🗜️ Compresión de Red (SoA vs AoS)</Text>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Ratio de Compresión:</Text>
            <Text style={[styles.metricValue, { color: '#00ff00', fontWeight: 'bold' }]}>
              {compression.compressionRatio ?? 0}x
            </Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Espacio Ahorrado en Red:</Text>
            <Text style={[styles.metricValue, { color: '#00ff00', fontWeight: 'bold' }]}>
              {compression.percentSpaceSaved ?? '0%'}
            </Text>
          </View>

          <View style={[styles.progressContainer, { marginVertical: 8 }]}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.min(spaceSavedVal, 100)}%`, backgroundColor: '#00ff00' }]} />
            </View>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Tamaño Total Binario (SoA):</Text>
            <Text style={styles.metricValue}>{formatBytes(compression.totalSoABytes ?? 0)}</Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Tamaño Equivalente JSON (AoS):</Text>
            <Text style={styles.metricValue}>{formatBytes(compression.totalAoSBytes ?? 0)}</Text>
          </View>

          <Text style={[styles.statLabel, { fontSize: 10, fontStyle: 'italic', marginTop: 4, lineHeight: 12 }]}>
            * Compara el pipeline de replicación continua binaria (SoA Msgpack) contra el formato clásico JSON (AoS).
          </Text>
        </View>

        {/* GARBAGE COLLECTION SECTION */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>🧹 Garbage Collection (Servidor)</Text>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Número de Pausas del GC:</Text>
            <Text style={styles.metricValue}>{gc.gcPauseCount ?? 0}</Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Frecuencia (Pausas / 1k ticks):</Text>
            <Text style={styles.metricValue}>{gc.gcPausesPer1000Ticks ?? 0}</Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Pausa Máxima Detectada:</Text>
            <Text style={[styles.metricValue, { color: '#ff4444' }]}>{gc.gcMaxPauseMs ?? 0} ms</Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Pausa Total del GC:</Text>
            <Text style={styles.metricValue}>{gc.gcTotalPauseMs ?? 0} ms</Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Ratio de Pausa GC:</Text>
            <Text style={styles.metricValue}>{gc.gcPauseRatePercent ?? '0%'}</Text>
          </View>
        </View>

        {/* MEMORY USAGE SECTION */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>💾 Memoria del Servidor (Heap)</Text>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Uso de Memoria Heap:</Text>
            <Text style={styles.metricValue}>
              {formatBytes(heapUsed)} / {formatBytes(heapTotal)} ({heapPercent.toFixed(1)}%)
            </Text>
          </View>

          <View style={[styles.progressContainer, { marginVertical: 8 }]}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.min(heapPercent, 100)}%`, backgroundColor: heapPercent > 80 ? '#ff4444' : (heapPercent > 50 ? '#ffbb00' : '#4a90e2') }]} />
            </View>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Límite Máximo del Heap:</Text>
            <Text style={styles.metricValue}>{formatBytes(mem.heapLimitBytes ?? 0)}</Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Asignación Total Histórica:</Text>
            <Text style={[styles.metricValue, { color: '#4a90e2' }]}>{formatBytes(mem.totalAllocatedBytes ?? 0)}</Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Liberación Total Histórica:</Text>
            <Text style={[styles.metricValue, { color: '#00ff00' }]}>{formatBytes(mem.totalFreedBytes ?? 0)}</Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderFrameTab = () => {
    if (!frameStats) return null;
    const isLowFps = frameStats.fps < 30;
    return (
      <View style={styles.tabContent}>
        <Text style={[styles.statText, isLowFps && styles.warningText]}>
          FPS: {frameStats.fps} {isLowFps ? '⚠️' : ''}
        </Text>
        <Text style={styles.statText}>Frame Time: {frameStats.frameTime.toFixed(2)}ms</Text>
        <Text style={styles.statText}>Tick: {frameStats.tick}</Text>
        <View style={styles.progressContainer}>
          <Text style={styles.statLabel}>Alpha (Interpolation): {frameStats.alpha.toFixed(2)}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${frameStats.alpha * 100}%` }]} />
          </View>
        </View>
      </View>
    );
  };

  const renderSystemsTab = () => {
    const timings = Object.entries(systemTimings).sort((a, b) => b[1] - a[1]);
    const maxTime = Math.max(...timings.map(t => t[1]), 0.001);

    return (
      <ScrollView style={styles.tabContent}>
        {timings.map(([name, time]) => (
          <View key={name} style={styles.systemItem}>
            <View style={styles.systemHeader}>
              <Text style={styles.systemName}>{name}</Text>
              <Text style={styles.systemTime}>{time.toFixed(3)}ms</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(time / maxTime) * 100}%`, backgroundColor: '#4a90e2' }]} />
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  const filteredEntities = entities.filter(e =>
    Object.keys(e.components).some(type => type.toLowerCase().includes(entityFilter.toLowerCase()))
  );

  const renderEntitiesTab = () => (
    <View style={styles.tabContent}>
      <TextInput
        style={styles.filterInput}
        placeholder="Filter by component type..."
        placeholderTextColor="#666"
        value={entityFilter}
        onChangeText={setEntityFilter}
      />
      <Text style={styles.countText}>Total Entities: {entities.length}</Text>
      <FlatList
        data={filteredEntities}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <EntityItem entity={item} />
        )}
      />
    </View>
  );

  const renderEventsTab = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity style={styles.clearButton} onPress={() => debugManager.clearEventLog()}>
        <Text style={styles.clearButtonText}>Clear Log</Text>
      </TouchableOpacity>
      <FlatList
        data={[...eventLog].reverse().slice(0, 50)}
        keyExtractor={(_item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.eventItem}>
            <Text style={styles.eventTime}>T+{(item.timestamp / 1000).toFixed(3)}s</Text>
            <Text style={styles.eventName}>{item.event}</Text>
            <Text style={styles.eventPayload} numberOfLines={2}>
              {JSON.stringify(item.payload)}
            </Text>
          </View>
        )}
      />
    </View>
  );

  const renderCollidersTab = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => setShowCollidersOverlay(!showCollidersOverlay)}
      >
        <View style={[styles.checkbox, showCollidersOverlay && styles.checkboxChecked]} />
        <Text style={styles.checkboxLabel}>Show Colliders Overlay</Text>
      </TouchableOpacity>
      <Text style={styles.countText}>Active Colliders: {colliders.length}</Text>
      <Text style={styles.statLabel}>Green = Trigger, Red = Solid</Text>
    </View>
  );

  const exportReplay = () => {
    if (!game) return;
    try {
      const recorder = (game as unknown as GameWithDebug).replayRecorder;
      if (!recorder) {
          Alert.alert('Not Supported', 'Replay recorder is not available in this game instance.');
          return;
      }
      const data = recorder.stopRecording();
      const json = JSON.stringify(data, null, 2);

      if (Platform.OS === 'web') {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `replay_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        Clipboard.setString(json);
        Alert.alert('Replay Exported', 'Replay data has been copied to clipboard as JSON.');
      }

      // Resume recording after export
      recorder.startRecording();
    } catch (e) {
      console.error('Failed to export replay:', e);
      Alert.alert('Export Failed', 'An error occurred while exporting replay data.');
    }
  };

  const renderReplayTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.statText}>Replay System</Text>
      <Text style={styles.statLabel}>
        Captures historical input intended to support debugging and reproducible simulation under controlled conditions.
      </Text>
      <TouchableOpacity style={styles.exportButton} onPress={exportReplay}>
        <Text style={styles.exportButtonText}>
          {Platform.OS === 'web' ? 'Download Replay JSON' : 'Copy Replay to Clipboard'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container} pointerEvents="box-none">
      {showCollidersOverlay && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg style={StyleSheet.absoluteFill}>
            {colliders.map((c, i) => {
              const color = c.isTrigger ? 'rgba(0, 255, 0, 0.7)' : 'rgba(255, 0, 0, 0.7)';
              if (c.type === 'circle') {
                return (
                  <Circle
                    key={i}
                    cx={c.x}
                    cy={c.y}
                    r={c.shape.radius}
                    stroke={color}
                    strokeWidth="2"
                    fill="transparent"
                  />
                );
              } else if (c.type === 'aabb') {
                return (
                  <Rect
                    key={i}
                    x={c.x - c.shape.halfWidth}
                    y={c.y - c.shape.halfHeight}
                    width={c.shape.halfWidth * 2}
                    height={c.shape.halfHeight * 2}
                    stroke={color}
                    strokeWidth="2"
                    fill="transparent"
                  />
                );
              }
              return null;
            })}
          </Svg>
        </View>
      )}

      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setIsOpen(!isOpen)}
      >
        <Text style={styles.toggleButtonText}>{isOpen ? '✕' : 'DBG'}</Text>
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.panel}>
          <View style={styles.tabBarContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
              {renderTabButton('Frame')}
              {renderTabButton('Systems')}
              {renderTabButton('Entities')}
              {renderTabButton('Events')}
              {renderTabButton('Colliders')}
              {renderTabButton('Replay')}
              {renderTabButton('Metrics')}
            </ScrollView>
          </View>
          <View style={styles.content}>
            {activeTab === 'Frame' && renderFrameTab()}
            {activeTab === 'Systems' && renderSystemsTab()}
            {activeTab === 'Entities' && renderEntitiesTab()}
            {activeTab === 'Events' && renderEventsTab()}
            {activeTab === 'Colliders' && renderCollidersTab()}
            {activeTab === 'Replay' && renderReplayTab()}
            {activeTab === 'Metrics' && renderMetricsTab()}
          </View>
        </View>
      )}
    </View>
  );
};

const EntityItem = ({ entity }: { entity: { id: number; components: Record<string, unknown> } }) => {
  const [expanded, setExpanded] = useState(false);
  const componentTypes = Object.keys(entity.components);

  return (
    <View style={styles.entityItem}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.entityHeader}>
        <Text style={styles.entityId}>ID: {entity.id}</Text>
        <Text style={styles.entityTypes} numberOfLines={1}>
          {componentTypes.join(', ')}
        </Text>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.entityDetails}>
          {componentTypes.map(type => (
            <View key={type} style={styles.componentDetail}>
              <Text style={styles.componentType}>{type}:</Text>
              <Text style={styles.componentValue}>
                {JSON.stringify(entity.components[type], null, 2)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  toggleButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  toggleButtonText: {
    color: '#00ff00',
    fontWeight: 'bold',
    fontSize: 12,
  },
  panel: {
    position: 'absolute',
    top: 110,
    right: 20,
    left: 20,
    bottom: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  tabBarContainer: {
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tabBar: {
    flexDirection: 'row',
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabButton: {
    backgroundColor: '#222',
    borderBottomWidth: 2,
    borderBottomColor: '#00ff00',
  },
  sectionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 6,
    padding: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionHeader: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 4,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  metricLabel: {
    color: '#aaa',
    fontSize: 12,
  },
  metricValue: {
    color: '#fff',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  tabButtonText: {
    color: '#888',
    fontSize: 10,
    fontWeight: '600',
  },
  activeTabButtonText: {
    color: '#00ff00',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: 15,
  },
  statText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  warningText: {
    color: '#ff4444',
  },
  progressContainer: {
    marginTop: 8,
  },
  statLabel: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00ff00',
  },
  systemItem: {
    marginBottom: 10,
  },
  systemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  systemName: {
    color: '#eee',
    fontSize: 12,
  },
  systemTime: {
    color: '#aaa',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  filterInput: {
    backgroundColor: '#222',
    color: '#fff',
    padding: 8,
    borderRadius: 4,
    marginBottom: 10,
    fontSize: 13,
  },
  countText: {
    color: '#666',
    fontSize: 11,
    marginBottom: 8,
  },
  entityItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    marginBottom: 6,
    overflow: 'hidden',
  },
  entityHeader: {
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  entityId: {
    color: '#00ff00',
    fontWeight: 'bold',
    marginRight: 10,
    fontSize: 12,
  },
  entityTypes: {
    color: '#aaa',
    fontSize: 11,
    flex: 1,
  },
  entityDetails: {
    padding: 10,
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  componentDetail: {
    marginBottom: 8,
  },
  componentType: {
    color: '#4a90e2',
    fontWeight: 'bold',
    fontSize: 11,
    marginBottom: 2,
  },
  componentValue: {
    color: '#ccc',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  clearButton: {
    alignSelf: 'flex-end',
    padding: 4,
    marginBottom: 8,
  },
  clearButtonText: {
    color: '#4a90e2',
    fontSize: 11,
  },
  eventItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    paddingVertical: 6,
  },
  eventTime: {
    color: '#555',
    fontSize: 9,
  },
  eventName: {
    color: '#00ff00',
    fontWeight: 'bold',
    fontSize: 12,
  },
  eventPayload: {
    color: '#aaa',
    fontSize: 10,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#444',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#00ff00',
    borderColor: '#00ff00',
  },
  checkboxLabel: {
    color: '#fff',
    fontSize: 14,
  },
  exportButton: {
    backgroundColor: '#00ff00',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 20,
  },
  exportButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

const __DEV__ = process.env.NODE_ENV !== "production";
