import { Pressable, ScrollView, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { useColorScheme } from "nativewind";
import { useAuth } from "../src/auth/AuthProvider";
import { DailyQuestCard } from "../src/quest/DailyQuestCard";
import { PlayerStatusCard } from "../src/player/PlayerStatusCard";

export default function HomeScreen() {
  const { session, loading, signOut } = useAuth();
  const { colorScheme, toggleColorScheme } = useColorScheme();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-1000 dark:bg-neutral-50">
        <Text className="text-neutral-600">Ucitavanje...</Text>
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <ScrollView className="flex-1 bg-neutral-1000 dark:bg-neutral-50">
      <View className="items-center gap-6 px-6 py-12">
        <View className="items-center gap-1">
          <Text className="text-4xl font-bold text-neutral-50 dark:text-neutral-1000">
            RISESOLO
          </Text>
          <Text className="text-base text-neutral-500 dark:text-neutral-700">System Status</Text>
        </View>

        <PlayerStatusCard />
        <DailyQuestCard />

        <View className="flex-row gap-3">
          <Pressable
            onPress={toggleColorScheme}
            className="rounded-md border border-neutral-500 px-4 py-2"
          >
            <Text className="text-neutral-50 dark:text-neutral-1000">
              Tema: {colorScheme === "dark" ? "Dark" : "Light"}
            </Text>
          </Pressable>
          <Pressable
            testID="sign-out"
            onPress={signOut}
            className="rounded-md border border-danger px-4 py-2"
          >
            <Text className="text-danger">Odjavi se</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
