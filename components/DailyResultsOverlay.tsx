import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { LeaderboardService } from "../src/services/LeaderboardService";
import { DailyChallengeService } from "../src/services/DailyChallengeService";
import { seedToString } from "../src/utils/SeedUtils";

interface LeaderboardEntry {
  playerId: string;
  score: number;
}

interface DailyResultsOverlayProps {
  gameId: string;
  score: number;
  seed: number;
  onClose: () => void;
}

/**
 * Overlay shown after completing a daily challenge.
 */
export const DailyResultsOverlay: React.FC<DailyResultsOverlayProps> = ({
  gameId,
  score,
  seed,
  onClose
}) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeToNext, setTimeToNext] = useState("");

  useEffect(() => {
    async function fetchData() {
      const dateKey = DailyChallengeService.getDateKey();
      const entries = (await LeaderboardService.fetchDailyLeaderboard(
        gameId,
        dateKey
      )) as LeaderboardEntry[];
      setLeaderboard(entries);
      setLoading(false);
    }
    fetchData();

    // Calculate time to next challenge (midnight UTC)
    const timer = setInterval(() => {
      const now = new Date();
      const next = new Date(now);
      next.setUTCHours(24, 0, 0, 0);
      const diff = next.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeToNext(`${h}h ${m}m ${s}s`);
    }, 1000);

    return () => clearInterval(timer);
  }, [gameId]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RESULTADOS DAILY</Text>

      <View style={styles.scoreBox}>
        <Text style={styles.scoreLabel}>TU SCORE</Text>
        <Text style={styles.scoreValue}>{score.toLocaleString()}</Text>
      </View>

      <View style={styles.seedBox}>
        <Text style={styles.seedLabel}>SEED DEL DÍA:</Text>
        <Text style={styles.seedValue}>{seedToString(seed)}</Text>
      </View>

      <Text style={styles.leaderboardTitle}>TOP 20 GLOBAL</Text>
      <ScrollView style={styles.leaderboard}>
        {loading ? (
          <Text style={styles.infoText}>Cargando leaderboard...</Text>
        ) : leaderboard.length === 0 ? (
          <Text style={styles.infoText}>No hay puntuaciones aún.</Text>
        ) : (
          leaderboard.map((entry, i) => (
            <View key={i} style={styles.entry}>
              <Text style={styles.rank}>{i + 1}.</Text>
              <Text style={styles.playerName}>{entry.playerId.slice(0, 8)}</Text>
              <Text style={styles.playerScore}>{entry.score.toLocaleString()}</Text>
            </View>
          ))
        )}
      </ScrollView>

      <Text style={styles.timerLabel}>PRÓXIMO CHALLENGE EN:</Text>
      <Text style={styles.timerValue}>{timeToNext}</Text>

      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>VOLVER</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    padding: 24,
    borderRadius: 16,
    width: "90%",
    maxWidth: 400,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  title: {
    color: "#FFD700",
    fontSize: 28,
    fontWeight: "bold",
    fontFamily: "monospace",
    marginBottom: 20,
  },
  scoreBox: {
    alignItems: "center",
    marginBottom: 20,
  },
  scoreLabel: {
    color: "#AAA",
    fontSize: 14,
    fontFamily: "monospace",
  },
  scoreValue: {
    color: "#FFF",
    fontSize: 36,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  seedBox: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: 8,
    borderRadius: 4,
  },
  seedLabel: {
    color: "#AAA",
    fontSize: 12,
    fontFamily: "monospace",
    marginRight: 8,
  },
  seedValue: {
    color: "#FFD700",
    fontSize: 14,
    fontFamily: "monospace",
    fontWeight: "bold",
  },
  leaderboardTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "monospace",
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  leaderboard: {
    width: "100%",
    maxHeight: 200,
    marginBottom: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
    padding: 10,
  },
  entry: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  rank: {
    color: "#FFD700",
    width: 30,
    fontFamily: "monospace",
  },
  playerName: {
    color: "#FFF",
    flex: 1,
    fontFamily: "monospace",
  },
  playerScore: {
    color: "#00FFDD",
    fontFamily: "monospace",
    fontWeight: "bold",
  },
  infoText: {
    color: "#888",
    textAlign: "center",
    marginTop: 20,
    fontFamily: "monospace",
  },
  timerLabel: {
    color: "#AAA",
    fontSize: 12,
    fontFamily: "monospace",
  },
  timerValue: {
    color: "#FFF",
    fontSize: 18,
    fontFamily: "monospace",
    marginBottom: 24,
  },
  closeButton: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 25,
  },
  closeButtonText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 18,
    fontFamily: "monospace",
  },
});
