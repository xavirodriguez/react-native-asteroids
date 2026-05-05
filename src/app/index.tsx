import { useState, useEffect } from "react";
import { router } from "expo-router";
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { Href } from "expo-router";
import { PlayerProfileService, PlayerProfile } from "../services/PlayerProfileService";
import { PassportOverlay } from "@/components/PassportOverlay";
import { DailyChallengeCard } from "@/components/DailyChallengeCard";

interface GameEntry {
  id: string;
  label: string;
  href: Href<string>;
}

const GAMES: GameEntry[] = [
  { id: "asteroids", label: "ASTEROIDES", href: "/asteroids" },
  { id: "space-invaders", label: "SPACE INVADERS", href: "/space-invaders" },
  { id: "flappybird", label: "FLAPPY BIRD", href: "/flappybird" },
  { id: "pong", label: "PONG", href: "/pong" },
];

export default function HomeScreen() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [showPassport, setShowPassport] = useState(false);

  useEffect(() => {
    PlayerProfileService.getProfile().then(setProfile);
  }, []);

  const handlePlayDaily = (gameId: string, seed: number) => {
      // For MVP we just navigate to asteroids with the seed
      router.push({
          pathname: "/asteroids",
          params: { seed: seed.toString(), isDaily: "true" }
      });
  };

  return (
    <SafeAreaProvider>
      <View style={styles.menuContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>RETRO ARCADE</Text>

          {profile && (
            <TouchableOpacity style={styles.profileSummary} onPress={() => setShowPassport(true)}>
              <Text style={styles.profileText}>{profile.displayName} - NIVEL {profile.level}</Text>
            </TouchableOpacity>
          )}

          {GAMES.map((game) => (
            <TouchableOpacity
              key={game.id}
              style={styles.menuButton}
              onPress={() => router.push(game.href)}
            >
              <Text style={styles.menuButtonText}>{game.label}</Text>
            </TouchableOpacity>
          ))}

          <DailyChallengeCard onPlay={handlePlayDaily} />

          <View style={{ height: 50 }} />
        </ScrollView>

        {showPassport && profile && (
          <PassportOverlay
            profile={profile}
            onClose={() => {
                setShowPassport(false);
                PlayerProfileService.getProfile().then(setProfile);
            }}
          />
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  menuContainer: {
    flex: 1,
    backgroundColor: "black",
  },
  scrollContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  title: {
    fontSize: 48,
    color: "white",
    fontFamily: "monospace",
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  profileSummary: {
    backgroundColor: '#222',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#444',
  },
  profileText: {
    color: '#FFD700',
    fontFamily: 'monospace',
    fontSize: 16,
    fontWeight: 'bold',
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
