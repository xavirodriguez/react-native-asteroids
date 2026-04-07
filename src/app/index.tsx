import { router } from "expo-router";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { Href } from "expo-router";

interface GameEntry {
  id: string;
  label: string;
  href: Href<string>;
}

const GAMES: GameEntry[] = [
  { id: "asteroids", label: "ASTEROIDES", href: "/asteroids" },
  { id: "space-invaders", label: "SPACE INVADERS", href: "/space-invaders" },
  { id: "flappybird", label: "FLAPPY BIRD", href: "/flappybird" },
];

export default function HomeScreen() {
  return (
    <SafeAreaProvider>
      <View style={styles.menuContainer}>
        <Text style={styles.title}>RETRO ARCADE</Text>
        {GAMES.map((game) => (
          <TouchableOpacity
            key={game.id}
            style={styles.menuButton}
            onPress={() => router.push(game.href)}
          >
            <Text style={styles.menuButtonText}>{game.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  menuContainer: {
    flex: 1,
    backgroundColor: "black",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 48,
    color: "white",
    fontFamily: "monospace",
    fontWeight: "bold",
    marginBottom: 40,
    textAlign: "center",
  },
  menuButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "white",
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 8,
    width: 300,
    alignItems: "center",
    marginTop: 20,
  },
  menuButtonText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
});
