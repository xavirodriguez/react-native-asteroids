import "../styles/globals.css";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ReducedMotionConfig, ReduceMotion } from "react-native-reanimated";
import { GameServicesProvider } from "@tiny-aster/react-native";
import { AudioSettingsService } from "../services/AudioSettingsService";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ReducedMotionConfig mode={ReduceMotion.Never} />
      <GameServicesProvider audioService={AudioSettingsService}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ title: "Arcade" }} />
          <Stack.Screen name="asteroids" options={{ title: "Asteroides" }} />
          <Stack.Screen name="space-invaders" options={{ title: "Space Invaders" }} />
          <Stack.Screen name="flappybird" options={{ title: "Flappy Bird" }} />
          <Stack.Screen name="pong" options={{ title: "Pong" }} />
        </Stack>
      </GameServicesProvider>
    </GestureHandlerRootView>
  );
}
