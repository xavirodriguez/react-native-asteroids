import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';

interface DailyResultsOverlayProps {
  gameId: string;
  score: number;
  seed: number;
  onClose: () => void;
}

export const DailyResultsOverlay: React.FC<DailyResultsOverlayProps> = ({ gameId, score, seed, onClose }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>RESULTADOS DIARIOS</Text>
      <View style={styles.resultBox}>
        <Text style={styles.label}>Puntuación Final</Text>
        <Text style={styles.score}>{score}</Text>
      </View>
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>Semilla: {seed}</Text>
        <Text style={styles.infoText}>¡Tu puntuación ha sido enviada!</Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={onClose}>
        <Text style={styles.buttonText}>VOLVER AL MENÚ</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
    width: '85%',
    maxWidth: 350,
  },
  title: {
    color: '#FFD700',
    fontFamily: 'monospace',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  resultBox: {
    alignItems: 'center',
    marginBottom: 30,
  },
  label: {
    color: '#AAA',
    fontFamily: 'monospace',
    fontSize: 16,
    marginBottom: 10,
  },
  score: {
    color: 'white',
    fontFamily: 'monospace',
    fontSize: 48,
    fontWeight: 'bold',
  },
  infoBox: {
    marginBottom: 40,
    alignItems: 'center',
  },
  infoText: {
    color: '#666',
    fontFamily: 'monospace',
    fontSize: 14,
    marginBottom: 5,
  },
  button: {
    backgroundColor: 'white',
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'black',
    fontFamily: 'monospace',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
