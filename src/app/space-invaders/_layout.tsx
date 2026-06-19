import { Stack } from "expo-router";

export default function SpaceInvadersLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "Space Invaders" }} />
    </Stack>
  );
}
