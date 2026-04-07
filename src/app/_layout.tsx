import "../styles/globals.css";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "Arcade" }} />
      <Stack.Screen name="asteroids" options={{ title: "Asteroides" }} />
      <Stack.Screen name="space-invaders" options={{ title: "Space Invaders" }} />
      <Stack.Screen name="flappybird" options={{ title: "Flappy Bird" }} />
    </Stack>
  );
}
