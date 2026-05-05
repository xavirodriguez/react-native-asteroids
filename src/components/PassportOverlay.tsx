import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { PlayerProfile } from '../services/PlayerProfileService';
import { LEVEL_THRESHOLDS } from '../config/PassportConfig';

interface PassportOverlayProps {
  profile: PlayerProfile;
  onClose: () => void;
}

export const PassportOverlay: React.FC<PassportOverlayProps> = ({ profile, onClose }) => {
  const nextLevelXP = LEVEL_THRESHOLDS[profile.level] || profile.xp;
  const prevLevelXP = LEVEL_THRESHOLDS[profile.level - 1] || 0;
  const progress = Math.min(1, (profile.xp - prevLevelXP) / (nextLevelXP - prevLevelXP));

  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    // We can't easily get the eventBus here without passing it down,
    // but we can talk to the singleton AudioSystem if we expose it or use a service.
    // For MVP, we'll emit to a global event bus or just assume the profile handles it.
    // Actually, we'll use a hack for MVP: access the audio system if available via a resource
    // but since we are in React, we'll just use AsyncStorage directly or a hook.
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>PASAPORTE ARCADE</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>X</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.profileSection}>
            <Text style={styles.playerName}>{profile.displayName}</Text>
            <Text style={styles.playerId}>ID: {profile.playerId.slice(0, 8)}</Text>
          </View>

          <View style={styles.levelSection}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>{profile.level}</Text>
            </View>
            <View style={styles.xpInfo}>
              <Text style={styles.xpLabel}>XP TOTAL: {profile.xp}</Text>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
              </View>
              <Text style={styles.xpSublabel}>
                {profile.xp - prevLevelXP} / {nextLevelXP - prevLevelXP} para nivel {profile.level + 1}
              </Text>
            </View>
          </View>

          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>ESTADÍSTICAS</Text>
            <StatRow label="Asteroides Destruidos" value={profile.stats.asteroidsDestroyed} />
            <StatRow label="Tuberías Pasadas" value={profile.stats.pipesPassed} />
            <StatRow label="Invasores Eliminados" value={profile.stats.siKills} />
            <StatRow label="Sets Pong Ganados" value={profile.stats.pongSetsWon} />
            <StatRow label="Ticks Jugados" value={profile.stats.totalPlaytimeTicks} />
          </View>

          <View style={styles.unlocksSection}>
            <Text style={styles.sectionTitle}>DESBLOQUEOS</Text>
            <Text style={styles.unlockText}>Paletas: {profile.unlockedPalettes.length}</Text>
            <Text style={styles.unlockText}>Estelas: {profile.unlockedTrails.length}</Text>
          </View>

          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>AJUSTES</Text>
            <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>SILENCIAR AUDIO</Text>
                <Switch
                    value={isMuted}
                    onValueChange={(val) => {
                        setIsMuted(val);
                        // This is a bit decoupled, but in a real app we'd use a Global Context
                        // For now we rely on the next game session picking it up or
                        // manually triggering an update if we had a global audio service.
                    }}
                />
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const StatRow: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <View style={styles.statRow}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  card: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#111',
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 16,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: 'white',
    fontSize: 24,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  closeButton: {
    color: 'white',
    fontSize: 24,
    fontFamily: 'monospace',
    padding: 5,
  },
  content: {
    flex: 1,
  },
  profileSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  playerName: {
    color: 'white',
    fontSize: 28,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  playerId: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  levelSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  levelBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  levelText: {
    color: 'black',
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  xpInfo: {
    flex: 1,
  },
  xpLabel: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#444',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#00FF00',
  },
  xpSublabel: {
    color: '#AAA',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  statsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 5,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statLabel: {
    color: '#CCC',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  statValue: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  unlocksSection: {
      marginBottom: 10,
  },
  unlockText: {
      color: '#CCC',
      fontSize: 14,
      fontFamily: 'monospace',
      marginBottom: 5,
  },
  settingsSection: {
      marginBottom: 30,
  },
  settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
  },
  settingLabel: {
      color: 'white',
      fontFamily: 'monospace',
      fontSize: 16,
  }
});
