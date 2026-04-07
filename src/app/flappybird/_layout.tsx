import { Stack } from "expo-router";

export default function FlappyBirdLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "Flappy Bird" }} />
    </Stack>
  );
}
