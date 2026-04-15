import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Clipboard, StyleProp, ViewStyle } from "react-native";
import { seedToString, stringToSeed } from "../src/utils/SeedUtils";

interface SeedWidgetProps {
  seed: number;
  onSeedEnter?: (seed: number) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Shared widget for displaying and entering game seeds.
 */
export const SeedWidget: React.FC<SeedWidgetProps> = ({ seed, onSeedEnter, style }) => {
  const [inputText, setInputText] = useState("");
  const [copyText, setCopyText] = useState("Copy Seed");

  const handleCopy = () => {
    Clipboard.setString(seedToString(seed));
    setCopyText("Copied!");
    setTimeout(() => setCopyText("Copy Seed"), 1500);
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.displayRow}>
        <Text style={styles.label}>Seed:</Text>
        <Text style={styles.seedText}>{seedToString(seed)}</Text>
        <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
          <Text style={styles.copyButtonText}>{copyText}</Text>
        </TouchableOpacity>
      </View>

      {onSeedEnter && (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="XXXX-XXXX"
            placeholderTextColor="#666"
            value={inputText}
            onChangeText={setInputText}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => {
              try {
                onSeedEnter(stringToSeed(inputText));
                setInputText("");
              } catch (_err) {
                // Invalid seed, could show error
              }
            }}
          >
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    alignItems: "center",
  },
  displayRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  label: {
    color: "#AAA",
    fontSize: 14,
    fontFamily: "monospace",
    marginRight: 8,
  },
  seedText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "monospace",
    fontWeight: "bold",
    marginRight: 12,
  },
  copyButton: {
    backgroundColor: "rgba(0, 255, 221, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#00FFDD",
  },
  copyButtonText: {
    color: "#00FFDD",
    fontSize: 12,
    fontFamily: "monospace",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    color: "#FFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    width: 120,
    marginRight: 8,
    fontFamily: "monospace",
    fontSize: 14,
  },
  applyButton: {
    backgroundColor: "#00FFDD",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  applyButtonText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
});
