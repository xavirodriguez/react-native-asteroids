import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface DailyChallengeBannerProps {
  gameId: string;
  onPlay: (seed: number) => void;
}

export const DailyChallengeBanner: React.FC<DailyChallengeBannerProps> = ({ gameId, onPlay }) => {
  // Simple deterministic seed based on date for the stub
  const dailySeed = new Date().getFullYear() * 10000 + (new Date().getMonth() + 1) * 100 + new Date().getDate();

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={styles.title}>DESAFÍO DIARIO</Text>
        <Text style={styles.subtitle}>Compite con todos en el mismo nivel</Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={() => onPlay(dailySeed)}>
        <Text style={styles.buttonText}>JUGAR</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD700',
    marginBottom: 20,
    width: '90%',
    maxWidth: 400,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#FFD700',
    fontFamily: 'monospace',
    fontSize: 16,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#888',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  button: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  buttonText: {
    color: 'black',
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
