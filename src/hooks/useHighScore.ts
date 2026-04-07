import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

const DEFAULT_KEY = "asteroids_high_score";

// Validation schema for high score
const HighScoreSchema = z.preprocess(
  (val) => (val === null ? 0 : Number.parseInt(val as string, 10)),
  z.number().min(0).catch(0)
);

/**
 * Hook to manage the persistent high score.
 *
 * @param key - The storage key to use for the high score.
 * @returns An object containing the current high score and a function to update it.
 */
export function useHighScore(key: string = DEFAULT_KEY) {
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    const loadHighScore = async () => {
      try {
        const value = await AsyncStorage.getItem(key);
        const validatedScore = HighScoreSchema.parse(value);
        setHighScore(validatedScore);
      } catch (error) {
        if (__DEV__) {
          console.error("Error loading high score:", error);
        }
        // Fallback to 0 if validation fails
        setHighScore(0);
      }
    };
    loadHighScore();
  }, [key]);

  const updateHighScore = useCallback(
    async (score: number) => {
      if (score > highScore) {
        try {
          await AsyncStorage.setItem(key, score.toString());
          setHighScore(score);
        } catch (error) {
          if (__DEV__) {
            console.error("Error saving high score:", error);
          }
        }
      }
    },
    [highScore, key]
  );

  return { highScore, updateHighScore };
}
