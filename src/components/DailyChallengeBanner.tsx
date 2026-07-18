import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { DailyChallengeService } from "../services/DailyChallengeService";

interface DailyChallengeBannerProps {
  gameId: string;
  onPlay: (seed: number) => void;
}

export const DailyChallengeBanner: React.FC<DailyChallengeBannerProps> = ({ gameId, onPlay }) => {
  const [seed, setSeed] = useState<number | null>(null);
  const [hasPlayed, setHasPlayed] = useState(false);

  useEffect(() => {
    const fetchChallenge = async () => {
      const currentSeed = DailyChallengeService.getDailySeed(gameId);
      const hasUsed = await DailyChallengeService.hasTodayAttemptBeenUsed(gameId);
      setSeed(currentSeed);
      setHasPlayed(hasUsed);
    };
    fetchChallenge();
  }, [gameId]);

  if (seed === null || hasPlayed) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>¡DESAFÍO DIARIO DISPONIBLE!</Text>
      <TouchableOpacity style={styles.button} onPress={() => onPlay(seed)}>
        <Text style={styles.buttonText}>JUGAR AHORA</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFD700",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
    width: "80%",
  },
  title: {
    color: "black",
    fontWeight: "bold",
    fontFamily: "monospace",
    marginBottom: 10,
    textAlign: "center",
  },
  button: {
    backgroundColor: "black",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: "#FFD700",
    fontWeight: "bold",
    fontFamily: "monospace",
  },
});
