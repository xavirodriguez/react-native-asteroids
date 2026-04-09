import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { DailyChallengeService } from "../src/services/DailyChallengeService";

interface DailyChallengeBannerProps {
  gameId: string;
  onPlay: (seed: number) => void;
}

/**
 * Banner for the daily challenge on the game start screen.
 */
export const DailyChallengeBanner: React.FC<DailyChallengeBannerProps> = ({ gameId, onPlay }) => {
  const [hasPlayed, setHasPlayed] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    async function checkStatus() {
      const used = await DailyChallengeService.hasTodayAttemptBeenUsed(gameId);
      setHasPlayed(used);
      if (used) {
        const todayScore = await DailyChallengeService.getTodayScore(gameId);
        setScore(todayScore);
      }
    }
    checkStatus();
  }, [gameId]);

  if (hasPlayed) {
    return (
      <View style={[styles.container, styles.played]}>
        <Text style={styles.title}>Daily Challenge</Text>
        <Text style={styles.scoreText}>Tu score de hoy: {score?.toLocaleString() ?? "???"}</Text>
        <Text style={styles.subText}>Vuelve mañana</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Daily Challenge Disponible</Text>
      <TouchableOpacity
        style={styles.playButton}
        onPress={() => onPlay(DailyChallengeService.getDailySeed(gameId))}
      >
        <Text style={styles.playButtonText}>JUGAR AHORA</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFD700",
    alignItems: "center",
    marginBottom: 20,
    width: 250,
  },
  played: {
    backgroundColor: "rgba(128, 128, 128, 0.2)",
    borderColor: "#888",
  },
  title: {
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "monospace",
    marginBottom: 8,
  },
  scoreText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "monospace",
  },
  subText: {
    color: "#AAA",
    fontSize: 12,
    fontFamily: "monospace",
    marginTop: 4,
  },
  playButton: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
    marginTop: 10,
  },
  playButtonText: {
    color: "#000",
    fontWeight: "bold",
    fontFamily: "monospace",
  },
});
