import "@/src/styles/globals.css";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "Arcade" }} />
      <Stack.Screen name="asteroids/index" options={{ title: "Asteroides" }} />
      <Stack.Screen name="space-invaders/index" options={{ title: "Space Invaders" }} />
      <Stack.Screen name="flappybird/index" options={{ title: "Flappy Bird" }} />
    </Stack>
  );
}
