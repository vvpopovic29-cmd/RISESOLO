import { Pressable, Text, View } from "react-native";
import { useDailyQuest } from "./use-daily-quest";

export function DailyQuestCard() {
  const { state, refetch, generate, generating } = useDailyQuest();

  if (state.status === "loading") {
    return (
      <View
        testID="daily-quest"
        className="w-full max-w-sm items-center gap-1 rounded-lg border border-neutral-400 p-4"
      >
        <Text className="text-neutral-600">Proveravam Daily Quest...</Text>
      </View>
    );
  }

  if (state.status === "error") {
    return (
      <View
        testID="daily-quest"
        className="w-full max-w-sm items-center gap-2 rounded-lg border border-danger p-4"
      >
        <Text className="text-danger">Ne mogu da ucitam Quest: {state.message}</Text>
        <Pressable onPress={refetch} className="rounded-md border border-neutral-500 px-3 py-1.5">
          <Text className="text-neutral-50 dark:text-neutral-1000">Pokusaj ponovo</Text>
        </Pressable>
      </View>
    );
  }

  if (state.status === "empty") {
    return (
      <View
        testID="daily-quest"
        className="w-full max-w-sm items-center gap-2 rounded-lg border border-neutral-400 p-4"
      >
        <Text className="text-neutral-600">Danas jos nemas Daily Quest.</Text>
        <Pressable
          testID="daily-quest-generate"
          onPress={generate}
          disabled={generating}
          className={`rounded-md bg-accent px-4 py-2 ${generating ? "opacity-50" : ""}`}
        >
          <Text className="font-semibold text-neutral-50">
            {generating ? "..." : "Generisi Daily Quest"}
          </Text>
        </Pressable>
      </View>
    );
  }

  const quest = state.data;

  return (
    <View
      testID="daily-quest"
      className="w-full max-w-sm gap-2 rounded-lg border border-accent p-4"
    >
      <Text className="text-xs uppercase tracking-wide text-accent">Daily Quest</Text>
      <Text className="text-lg font-bold text-neutral-50 dark:text-neutral-1000">
        {quest.title}
      </Text>
      {quest.description ? <Text className="text-neutral-600">{quest.description}</Text> : null}
      <View className="flex-row items-center justify-between">
        <Text className="text-neutral-600">
          Progres: {quest.progressCount} / {quest.targetCount}
        </Text>
        <Text className="text-reward">+{quest.xpReward} XP</Text>
      </View>
    </View>
  );
}
