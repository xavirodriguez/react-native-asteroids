import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { LeaderboardService } from '../src/services/LeaderboardService';

interface LeaderboardOverlayProps {
  gameId: string;
  onClose: () => void;
}

export const LeaderboardOverlay: React.FC<LeaderboardOverlayProps> = ({ gameId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const dateKey = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const data = await LeaderboardService.fetchDailyLeaderboard(gameId, dateKey);
        setScores(data);
      } catch (e) {
        setError("No se pudo cargar el ranking");
      } finally {
        setLoading(false);
      }
    };
    fetchScores();
  }, [gameId]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>RANKING {gameId.toUpperCase()}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>X</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="white" />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : scores.length === 0 ? (
          <Text style={styles.emptyText}>Sin puntuaciones hoy</Text>
        ) : (
          <ScrollView style={styles.content}>
            {scores.map((s, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.rank}>{i + 1}.</Text>
                <Text style={styles.name}>{s.displayName || s.playerId.slice(0, 8)}</Text>
                <Text style={styles.score}>{s.score}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3000,
  },
  card: {
    width: '85%',
    maxHeight: '70%',
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 12,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#FFD700',
    fontSize: 20,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  closeButton: {
    color: 'white',
    fontSize: 20,
    fontFamily: 'monospace',
  },
  content: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  rank: {
    color: '#666',
    width: 30,
    fontFamily: 'monospace',
  },
  name: {
    color: 'white',
    flex: 1,
    fontFamily: 'monospace',
  },
  score: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    fontFamily: 'monospace',
  }
});
