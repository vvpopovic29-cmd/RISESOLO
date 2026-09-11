import { Pressable, Text, View } from "react-native";
import type { ApiClient } from "@risesolo/api-client";
import type { QuestLinkedAction, QuestResponse, QuestType } from "@risesolo/validation";
import { useQuest } from "./use-quest";

interface QuestCardProps {
  testID: string;
  type: QuestType;
  linkedAction: QuestLinkedAction;
  generate: (apiClient: ApiClient) => Promise<QuestResponse>;
  label: string;
  loadingText: string;
  emptyText: string;
  generateButtonText: string;
  errorPrefix: string;
}

/** Generalizovana varijanta `DailyQuestCard`-a za Weekly/Side questove. */
export function QuestCard({
  testID,
  type,
  linkedAction,
  generate,
  label,
  loadingText,
  emptyText,
  generateButtonText,
  errorPrefix,
}: QuestCardProps) {
  const {
    state,
    refetch,
    generate: generateQuest,
    generating,
  } = useQuest(type, linkedAction, generate);

  if (state.status === "loading") {
    return (
      <View
        testID={testID}
        className="w-full max-w-sm items-center gap-1 rounded-lg border border-neutral-400 p-4"
      >
        <Text className="text-neutral-600">{loadingText}</Text>
      </View>
    );
  }

  if (state.status === "error") {
    return (
      <View
        testID={testID}
        className="w-full max-w-sm items-center gap-2 rounded-lg border border-danger p-4"
      >
        <Text className="text-danger">
          {errorPrefix}: {state.message}
        </Text>
        <Pressable onPress={refetch} className="rounded-md border border-neutral-500 px-3 py-1.5">
          <Text className="text-neutral-50 dark:text-neutral-1000">Pokusaj ponovo</Text>
        </Pressable>
      </View>
    );
  }

  if (state.status === "empty") {
    return (
      <View
        testID={testID}
        className="w-full max-w-sm items-center gap-2 rounded-lg border border-neutral-400 p-4"
      >
        <Text className="text-neutral-600">{emptyText}</Text>
        <Pressable
          testID={`${testID}-generate`}
          onPress={generateQuest}
          disabled={generating}
          className={`rounded-md bg-accent px-4 py-2 ${generating ? "opacity-50" : ""}`}
        >
          <Text className="font-semibold text-neutral-50">
            {generating ? "..." : generateButtonText}
          </Text>
        </Pressable>
      </View>
    );
  }

  const quest = state.data;

  return (
    <View testID={testID} className="w-full max-w-sm gap-2 rounded-lg border border-premium p-4">
      <Text className="text-xs uppercase tracking-wide text-premium">{label}</Text>
      <Text className="text-lg font-bold text-neutral-50 dark:text-neutral-1000">
        {quest.title}
      </Text>
      {quest.description ? <Text className="text-neutral-600">{quest.description}</Text> : null}
      {quest.targetRank ? (
        <Text className="text-xs text-premium">Nagrada: Rank {quest.targetRank}</Text>
      ) : null}
      <View className="flex-row items-center justify-between">
        <Text className="text-neutral-600">
          Progres: {quest.progressCount} / {quest.targetCount}
        </Text>
        <Text className="text-reward">+{quest.xpReward} XP</Text>
      </View>
    </View>
  );
}
