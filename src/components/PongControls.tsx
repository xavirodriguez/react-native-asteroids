import React from "react";
import { StyleSheet, View, TouchableOpacity, Text } from "react-native";

interface PongControlsProps {
  onP1Up: (pressed: boolean) => void;
  onP1Down: (pressed: boolean) => void;
  onP2Up: (pressed: boolean) => void;
  onP2Down: (pressed: boolean) => void;
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
      <View style={styles.side} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.button}
          onPressIn={() => onP1Up(true)}
          onPressOut={() => onP1Up(false)}
        >
          <Text style={styles.text}>▲</Text>
        </TouchableOpacity>
        <View style={{ height: 20 }} />
        <TouchableOpacity
          style={styles.button}
          onPressIn={() => onP1Down(true)}
          onPressOut={() => onP1Down(false)}
        >
          <Text style={styles.text}>▼</Text>
        </TouchableOpacity>
      </View>

      {showP2Controls && (
        <View style={styles.side} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.button}
            onPressIn={() => onP2Up(true)}
            onPressOut={() => onP2Up(false)}
          >
            <Text style={styles.text}>▲</Text>
          </TouchableOpacity>
          <View style={{ height: 20 }} />
          <TouchableOpacity
            style={styles.button}
            onPressIn={() => onP2Down(true)}
            onPressOut={() => onP2Down(false)}
          >
            <Text style={styles.text}>▼</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 40,
  },
  side: {
    justifyContent: "flex-end",
  },
  button: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  text: {
    color: "white",
    fontSize: 32,
  },
});
