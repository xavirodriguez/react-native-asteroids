import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { Mutator } from "../config/MutatorConfig";

interface MutatorBadgeProps {
  mutators: Mutator[];
}

export const MutatorBadge: React.FC<MutatorBadgeProps> = ({ mutators }) => {
  if (mutators.length === 0) return null;

  return (
    <View style={styles.container}>
      {mutators.map((mutator, index) => (
        <View key={index} style={styles.badge}>
          <Text style={styles.text}>{mutator.name.toUpperCase()}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 20,
  },
  badge: {
    backgroundColor: "#FF00FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    margin: 5,
  },
  text: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
});
