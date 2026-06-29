import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Mutator } from '../config/MutatorConfig';

interface MutatorBadgeProps {
  mutators: Mutator[];
}

export const MutatorBadge: React.FC<MutatorBadgeProps> = ({ mutators }) => {
  if (!mutators || mutators.length === 0) return null;

  return (
    <View style={styles.container}>
      {mutators.map((mutator, index) => (
        <View key={index} style={styles.badge}>
          <Text style={styles.badgeText}>{mutator.name.toUpperCase()}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  badge: {
    backgroundColor: '#442200',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    margin: 4,
    borderWidth: 1,
    borderColor: '#FF8800',
  },
  badgeText: {
    color: '#FF8800',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
