import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Mutator } from "../src/config/MutatorConfig";

interface MutatorBadgeProps {
  mutators: Mutator[];
}

/**
 * Display active mutators as badges.
 */
export const MutatorBadge: React.FC<MutatorBadgeProps> = ({ mutators }) => {
  if (mutators.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>MUTADORES SEMANALES:</Text>
      <View style={styles.badgeRow}>
        {mutators.map(m => (
          <View key={m.id} style={styles.badge}>
            <Text style={styles.badgeName}>{m.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginBottom: 20,
    width: "100%",
  },
  header: {
    color: "#FF00DD",
    fontSize: 12,
    fontFamily: "monospace",
    fontWeight: "bold",
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  badge: {
    backgroundColor: "rgba(255, 0, 221, 0.2)",
    borderWidth: 1,
    borderColor: "#FF00DD",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    margin: 4,
  },
  badgeName: {
    color: "#FF00DD",
    fontSize: 12,
    fontFamily: "monospace",
    fontWeight: "bold",
  },
});
