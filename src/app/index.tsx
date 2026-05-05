import { useState, useEffect } from "react";
import { router } from "expo-router";
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { Href } from "expo-router";
import { PlayerProfileService, PlayerProfile } from "../services/PlayerProfileService";
import { PassportOverlay } from "../components/PassportOverlay";
import { DailyChallengeCard } from "../components/DailyChallengeCard";
import { LeaderboardOverlay } from "../components/LeaderboardOverlay";

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
  const [showLeaderboard, setShowLeaderboard] = useState<string | null>(null);

  const refreshProfile = () => {
    PlayerProfileService.getProfile().then(setProfile);
  };

  useEffect(() => {
    refreshProfile();

    // Listen for level up events to refresh the profile summary
    // Since index.tsx is the entry point, we can rely on it being mounted
    // but the EventBus is usually per-game.
    // However, PlayerProfileService is a singleton.

    // We'll refresh when focusing the screen too
    const interval = setInterval(refreshProfile, 5000);
    return () => clearInterval(interval);
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
            <View key={game.id} style={styles.menuRow}>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => router.push(game.href)}
              >
                <Text style={styles.menuButtonText}>{game.label}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rankButton}
                onPress={() => setShowLeaderboard(game.id)}
              >
                <Text style={styles.rankButtonText}>🏆</Text>
              </TouchableOpacity>
            </View>
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

        {showLeaderboard && (
          <LeaderboardOverlay
            gameId={showLeaderboard}
            onClose={() => setShowLeaderboard(null)}
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
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    width: 360,
    justifyContent: 'center',
  },
  menuButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "white",
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 8,
    width: 280,
    alignItems: "center",
  },
  rankButton: {
    marginLeft: 10,
    backgroundColor: '#222',
    width: 60,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  rankButtonText: {
    fontSize: 24,
  },
  menuButtonText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
});
