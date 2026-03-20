import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const HIGH_SCORE_KEY = "asteroids_high_score";

/**
 * Hook to manage the persistent high score.
 *
 * @returns An object containing the current high score and a function to update it.
 */
export function useHighScore() {
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    const loadHighScore = async () => {
      try {
        const value = await AsyncStorage.getItem(HIGH_SCORE_KEY);
        if (value !== null) {
          setHighScore(Number.parseInt(value, 10));
        }
      } catch (error) {
        if (__DEV__) {
          console.error("Error loading high score:", error);
        }
      }
    };
    loadHighScore();
  }, []);

  const updateHighScore = useCallback(
    async (score: number) => {
      if (score > highScore) {
        try {
          await AsyncStorage.setItem(HIGH_SCORE_KEY, score.toString());
          setHighScore(score);
        } catch (error) {
          if (__DEV__) {
            console.error("Error saving high score:", error);
          }
        }
      }
    },
    [highScore]
  );

  return { highScore, updateHighScore };
}
