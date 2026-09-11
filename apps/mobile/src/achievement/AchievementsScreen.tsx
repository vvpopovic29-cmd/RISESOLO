import { Pressable, ScrollView, Text, View } from "react-native";
import type { AchievementCategory, AchievementResponse } from "@risesolo/validation";
import { useAchievements } from "./use-achievements";

const categoryLabels: Record<AchievementCategory, string> = {
  training: "Trening",
  consistency: "Konzistentnost",
  nutrition: "Ishrana",
  progression: "Napredak",
};

const categoryOrder: AchievementCategory[] = [
  "training",
  "consistency",
  "nutrition",
  "progression",
];

function groupByCategory(
  achievements: AchievementResponse[],
): Array<[AchievementCategory, AchievementResponse[]]> {
  const groups = new Map<AchievementCategory, AchievementResponse[]>();
  for (const achievement of achievements) {
    const existing = groups.get(achievement.category) ?? [];
    existing.push(achievement);
    groups.set(achievement.category, existing);
  }
  return categoryOrder
    .filter((category) => groups.has(category))
    .map((category) => [category, groups.get(category) ?? []]);
}

export function AchievementsScreen() {
  const { state, refetch } = useAchievements();

  if (state.status === "loading") {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-1000 dark:bg-neutral-50">
        <Text className="text-neutral-600">Ucitavanje achievement-a...</Text>
      </View>
    );
  }

  if (state.status === "error") {
    return (
      <View className="flex-1 items-center justify-center gap-2 bg-neutral-1000 px-6 dark:bg-neutral-50">
        <Text testID="achievements-error" className="text-danger">
          Ne mogu da ucitam achievement-e: {state.message}
        </Text>
        <Pressable onPress={refetch} className="rounded-md border border-neutral-500 px-3 py-1.5">
          <Text className="text-neutral-50 dark:text-neutral-1000">Pokusaj ponovo</Text>
        </Pressable>
      </View>
    );
  }

  const unlockedCount = state.data.filter((achievement) => achievement.unlocked).length;

  return (
    <ScrollView className="flex-1 bg-neutral-1000 dark:bg-neutral-50">
      <View testID="achievements-list" className="gap-6 px-6 py-12">
        <View className="items-center gap-1">
          <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">
            Achievements
          </Text>
          <Text className="text-neutral-600">
            {unlockedCount} / {state.data.length} otkljucano
          </Text>
        </View>

        {groupByCategory(state.data).map(([category, achievements]) => (
          <View key={category} className="gap-2">
            <Text className="text-xs uppercase tracking-wide text-accent">
              {categoryLabels[category]}
            </Text>
            {achievements.map((achievement) => (
              <View
                key={achievement.id}
                testID={`achievement-${achievement.code}`}
                className={`gap-1 rounded-lg border p-4 ${
                  achievement.unlocked ? "border-reward" : "border-neutral-400 opacity-60"
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <Text className="font-semibold text-neutral-50 dark:text-neutral-1000">
                    {achievement.title}
                  </Text>
                  <Text className={achievement.unlocked ? "text-reward" : "text-neutral-600"}>
                    {achievement.unlocked ? "Otkljucano" : "Zakljucano"}
                  </Text>
                </View>
                <Text className="text-neutral-600">{achievement.description}</Text>
                <View className="flex-row gap-3">
                  {achievement.xpReward > 0 ? (
                    <Text className="text-xs text-accent">+{achievement.xpReward} XP</Text>
                  ) : null}
                  {achievement.coinReward > 0 ? (
                    <Text className="text-xs text-reward">+{achievement.coinReward} coins</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
