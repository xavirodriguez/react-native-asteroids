import { Stack } from "expo-router";

export default function PongLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "Pong" }} />
    </Stack>
  );
}
