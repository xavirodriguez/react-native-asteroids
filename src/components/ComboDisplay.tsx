import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface ComboDisplayProps {
  multiplier: number;
  isActive: boolean;
}

export const ComboDisplay: React.FC<ComboDisplayProps> = ({ multiplier, isActive }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive && multiplier > 1) {
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.5,
          useNativeDriver: true,
          tension: 100,
          friction: 3,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [multiplier, isActive]);

  if (!isActive || multiplier <= 1) return null;

  const getComboColor = () => {
    if (multiplier >= 10) return '#FFD700'; // Gold
    if (multiplier >= 5) return '#FF8C00'; // DarkOrange
    return '#FFFFFF';
  };

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Text style={[
          styles.comboText,
          { color: getComboColor() },
          multiplier >= 10 && styles.goldShadow
        ]}>
          x{multiplier}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 100,
  },
  comboText: {
    fontSize: 32,
    fontWeight: '900',
    fontStyle: 'italic',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  goldShadow: {
    textShadowColor: 'rgba(255, 215, 0, 0.5)',
    textShadowRadius: 10,
  },
});
