import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { DailyChallengeService } from '../src/services/DailyChallengeService';
import { MutatorService } from '../src/services/MutatorService';

interface DailyChallengeCardProps {
  onPlay: (gameId: string, seed: number) => void;
}

export const DailyChallengeCard: React.FC<DailyChallengeCardProps> = ({ onPlay }) => {
  const [gameId, setGameId] = useState<string>("asteroids");
  const [played, setPlayed] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    // For MVP, daily challenge is asteroids. In a real app, this could rotate.
    const todayGameId = "asteroids";
    setGameId(todayGameId);

    DailyChallengeService.hasTodayAttemptBeenUsed(todayGameId).then(setPlayed);
    DailyChallengeService.getTodayScore(todayGameId).then(setScore);
  }, []);

  const handlePlay = () => {
    const seed = DailyChallengeService.getDailySeed(gameId);
    onPlay(gameId, seed);
  };

  const mutators = MutatorService.getActiveMutatorsForGame(gameId);

  return (
    <TouchableOpacity style={styles.card} onPress={handlePlay}>
      <View style={styles.header}>
        <Text style={styles.title}>RETO DIARIO</Text>
        {played && <View style={styles.playedBadge}><Text style={styles.playedText}>JUGADO</Text></View>}
      </View>

      <Text style={styles.gameName}>{gameId.toUpperCase()}</Text>

      {mutators.length > 0 && (
          <Text style={styles.mutatorText}>Mutador: {mutators[0].name}</Text>
      )}

      {score !== null && (
        <Text style={styles.scoreText}>Tu Score: {score}</Text>
      )}

      {!played ? (
        <Text style={styles.cta}>¡Jugar ahora!</Text>
      ) : (
        <Text style={styles.cta}>Mejorar puntuación</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 12,
    padding: 16,
    width: 300,
    marginTop: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    color: '#FFD700',
    fontSize: 18,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  playedBadge: {
    backgroundColor: '#00FF00',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  playedText: {
    color: 'black',
    fontSize: 10,
    fontWeight: 'bold',
  },
  gameName: {
    color: 'white',
    fontSize: 22,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  mutatorText: {
    color: '#AAA',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  scoreText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  cta: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'monospace',
    textAlign: 'right',
    textDecorationLine: 'underline',
  }
});
