import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';

interface SeedWidgetProps {
  seed: number;
  onSeedEnter: (seed: number) => void;
  style?: ViewStyle;
}

export const SeedWidget: React.FC<SeedWidgetProps> = ({ seed, onSeedEnter, style }) => {
  const [inputValue, setInputValue] = useState(seed.toString());

  const handleApply = () => {
    const newSeed = parseInt(inputValue, 10);
    if (!isNaN(newSeed)) {
      onSeedEnter(newSeed);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>Semilla:</Text>
      <TextInput
        style={styles.input}
        value={inputValue}
        onChangeText={setInputValue}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor="#666"
      />
      <TouchableOpacity style={styles.button} onPress={handleApply}>
        <Text style={styles.buttonText}>APLICAR</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  label: {
    color: '#AAA',
    fontFamily: 'monospace',
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: 'white',
    fontFamily: 'monospace',
    fontSize: 16,
    padding: 5,
  },
  button: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 10,
  },
  buttonText: {
    color: 'white',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
