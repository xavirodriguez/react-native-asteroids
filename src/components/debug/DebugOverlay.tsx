import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  Platform
} from 'react-native';
import { BaseGame } from '../../engine/core/BaseGame';
import type { DebugManager, EventLogEntry, FrameStats, ColliderShapeInfo } from '../../engine/debug/DebugManager';
import { useDebugManager } from '../../hooks/useGame';
import Svg, { Circle, Rect } from 'react-native-svg';

interface DebugOverlayProps {
  game: BaseGame<any, any> | null;
}

type TabType = 'Frame' | 'Systems' | 'Entities' | 'Events' | 'Colliders';

/**
 * DebugOverlay component that renders a floating panel with real-time engine metrics.
 * Designed to be tree-shakeable and only active in development environments.
 */
export const DebugOverlay: React.FC<DebugOverlayProps> = ({ game }) => {
  if (!__DEV__) return null;

  const debugManager = useDebugManager(game);
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
          <View style={styles.tabBar}>
            {renderTabButton('Frame')}
            {renderTabButton('Systems')}
            {renderTabButton('Entities')}
            {renderTabButton('Events')}
            {renderTabButton('Colliders')}
          </View>
          <View style={styles.content}>
            {activeTab === 'Frame' && renderFrameTab()}
            {activeTab === 'Systems' && renderSystemsTab()}
            {activeTab === 'Entities' && renderEntitiesTab()}
            {activeTab === 'Events' && renderEventsTab()}
            {activeTab === 'Colliders' && renderCollidersTab()}
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTabButton: {
    backgroundColor: '#222',
    borderBottomWidth: 2,
    borderBottomColor: '#00ff00',
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
});

const __DEV__ = process.env.NODE_ENV !== "production";
