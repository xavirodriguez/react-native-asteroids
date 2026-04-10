import React from "react";
import { StyleSheet, View, TouchableOpacity, Text, Platform } from "react-native";

interface PongControlsProps {
  onP1Up: (pressed: boolean) => void;
  onP1Down: (pressed: boolean) => void;
  onP2Up: (pressed: boolean) => void;
  onP2Down: (pressed: boolean) => void;
}

export const PongControls: React.FC<PongControlsProps> = ({
  onP1Up,
  onP1Down,
  onP2Up,
  onP2Down,
}) => {
  if (Platform.OS === "web") return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.side}>
        <TouchableOpacity
          style={styles.touchArea}
          onPressIn={() => onP1Up(true)}
          onPressOut={() => onP1Up(false)}
        >
          <Text style={styles.hint}>P1 UP</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.touchArea}
          onPressIn={() => onP1Down(true)}
          onPressOut={() => onP1Down(false)}
        >
          <Text style={styles.hint}>P1 DOWN</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.side}>
        <TouchableOpacity
          style={styles.touchArea}
          onPressIn={() => onP2Up(true)}
          onPressOut={() => onP2Up(false)}
        >
          <Text style={styles.hint}>P2 UP</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.touchArea}
          onPressIn={() => onP2Down(true)}
          onPressOut={() => onP2Down(false)}
        >
          <Text style={styles.hint}>P2 DOWN</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    zIndex: 5,
  },
  side: {
    flex: 1,
    height: "100%",
  },
  touchArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  hint: {
    color: "rgba(255, 255, 255, 0.1)",
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
});
