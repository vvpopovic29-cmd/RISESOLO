import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import type { AchievementDto } from "@risesolo/validation";
import { useAuth } from "../src/auth/AuthContext";
import { getAchievementDisplay } from "../src/achievements/achievement-display";
import { useAchievements } from "../src/achievements/use-achievements";
import { ErrorState } from "../src/ui/ErrorState";
import { Screen } from "../src/ui/Screen";

export default function AchievementsScreen() {
  const { apiClient } = useAuth();
  const { state, refetch } = useAchievements(apiClient);

  return (
    <Screen>
      <Pressable onPress={() => router.back()} testID="achievements-back">
        <Text className="text-accent">{"< Nazad"}</Text>
      </Pressable>

      <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">Achievements</Text>

      {state.status === "loading" ? (
        <Text className="text-neutral-500 dark:text-neutral-600">Ucitavam...</Text>
      ) : state.status === "error" ? (
        <ErrorState message={state.message} onRetry={refetch} testID="achievements-error" />
      ) : (
        <>
          <Text testID="achievements-progress" className="text-sm text-neutral-500 dark:text-neutral-600">
            {state.data.filter((a) => a.unlocked).length} / {state.data.length} otkljucano
          </Text>
          <View className="gap-3">
            {state.data.map((achievement) => (
              <AchievementCard key={achievement.id} achievement={achievement} />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

function AchievementCard({ achievement }: { achievement: AchievementDto }) {
  const display = getAchievementDisplay(achievement.id);

  return (
    <View
      testID={`achievement-${achievement.id}`}
      className={`flex-row items-center gap-3 rounded-lg border p-4 ${
        achievement.unlocked
          ? "border-accent bg-accent/10"
          : "border-neutral-700 opacity-50 dark:border-neutral-400"
      }`}
    >
      <Text className="text-2xl">{display.icon}</Text>
      <View className="flex-1 gap-0.5">
        <Text className="font-semibold text-neutral-50 dark:text-neutral-1000">{display.title}</Text>
        <Text className="text-xs text-neutral-500 dark:text-neutral-600">{display.description}</Text>
        {achievement.unlocked && achievement.unlockedAt ? (
          <Text className="text-xs text-accent">Otkljucano {new Date(achievement.unlockedAt).toLocaleDateString("sr-Latn-RS")}</Text>
        ) : null}
      </View>
    </View>
  );
}
