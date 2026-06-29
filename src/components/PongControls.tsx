import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';

interface PongControlsProps {
  onP1Up: (pressed: boolean) => void;
  onP1Down: (pressed: boolean) => void;
  onP2Up?: (pressed: boolean) => void;
  onP2Down?: (pressed: boolean) => void;
  showP2Controls?: boolean;
}

export const PongControls: React.FC<PongControlsProps> = ({
  onP1Up,
  onP1Down,
  onP2Up,
  onP2Down,
  showP2Controls = false,
}) => {
  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.controlGroup} pointerEvents="box-none">
        <ControlButton
          label="▲"
          onPressIn={() => onP1Up(true)}
          onPressOut={() => onP1Up(false)}
        />
        <View style={{ height: 20 }} />
        <ControlButton
          label="▼"
          onPressIn={() => onP1Down(true)}
          onPressOut={() => onP1Down(false)}
        />
      </View>

      {showP2Controls && onP2Up && onP2Down && (
        <View style={styles.controlGroup} pointerEvents="box-none">
          <ControlButton
            label="▲"
            onPressIn={() => onP2Up(true)}
            onPressOut={() => onP2Up(false)}
          />
          <View style={{ height: 20 }} />
          <ControlButton
            label="▼"
            onPressIn={() => onP2Down(true)}
            onPressOut={() => onP2Down(false)}
          />
        </View>
      )}
    </View>
  );
};

const ControlButton: React.FC<{
  label: string;
  onPressIn: () => void;
  onPressOut: () => void;
}> = ({ label, onPressIn, onPressOut }) => (
  <TouchableOpacity
    style={styles.button}
    onPressIn={onPressIn}
    onPressOut={onPressOut}
    activeOpacity={0.6}
  >
    <Text style={styles.buttonText}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 40,
    paddingBottom: 60,
    zIndex: 10,
  },
  controlGroup: {
    alignItems: 'center',
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  buttonText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
});
