import React, { useState } from "react";
import { StyleSheet, View, TextInput, TouchableOpacity, Text, ViewStyle } from "react-native";

interface SeedWidgetProps {
  seed: number;
  onSeedEnter: (seed: number) => void;
  style?: ViewStyle;
}

export const SeedWidget: React.FC<SeedWidgetProps> = ({ seed, onSeedEnter, style }) => {
  const [value, setValue] = useState(seed.toString());

  const handleApply = () => {
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      onSeedEnter(num);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={setValue}
        placeholder="SEED"
        placeholderTextColor="#666"
        keyboardType="numeric"
      />
      <TouchableOpacity style={styles.button} onPress={handleApply}>
        <Text style={styles.buttonText}>APLICAR SEED</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    backgroundColor: "#222",
    color: "white",
    padding: 10,
    borderRadius: 8,
    width: 100,
    marginRight: 10,
    fontFamily: "monospace",
    textAlign: "center",
  },
  button: {
    backgroundColor: "#444",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: "white",
    fontFamily: "monospace",
    fontWeight: "bold",
  },
});
