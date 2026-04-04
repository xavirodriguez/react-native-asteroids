import { StyleSheet, View, Text, TouchableOpacity } from "react-native";

export const PongControls: React.FC<{
  onP1Up: (pressed: boolean) => void;
  onP1Down: (pressed: boolean) => void;
  onP2Up: (pressed: boolean) => void;
  onP2Down: (pressed: boolean) => void;
}> = ({ onP1Up, onP1Down, onP2Up, onP2Down }) => {
  return (
    <View style={styles.container}>
      <View style={styles.side}>
        <TouchableOpacity
          style={styles.button}
          onPressIn={() => onP1Up(true)}
          onPressOut={() => onP1Up(false)}
        >
          <Text style={styles.label}>↑</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPressIn={() => onP1Down(true)}
          onPressOut={() => onP1Down(false)}
        >
          <Text style={styles.label}>↓</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.side}>
        <TouchableOpacity
          style={styles.button}
          onPressIn={() => onP2Up(true)}
          onPressOut={() => onP2Up(false)}
        >
          <Text style={styles.label}>↑</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPressIn={() => onP2Down(true)}
          onPressOut={() => onP2Down(false)}
        >
          <Text style={styles.label}>↓</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 20,
  },
  side: {
    gap: 10,
  },
  button: {
    backgroundColor: "rgba(255,255,255,0.2)",
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: "white",
    fontSize: 24,
  },
});
