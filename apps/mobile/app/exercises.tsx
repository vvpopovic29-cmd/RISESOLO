import { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import type { ExerciseDto } from "@risesolo/validation";
import { useAuth } from "../src/auth/AuthContext";
import { useExercises } from "../src/exercises/use-exercises";
import { useI18n } from "../src/i18n";
import { ChoiceGroup } from "../src/ui/ChoiceGroup";
import { ErrorState } from "../src/ui/ErrorState";
import { Screen } from "../src/ui/Screen";

type ExerciseType = NonNullable<ExerciseDto["type"]>;
type Difficulty = NonNullable<ExerciseDto["difficulty"]>;

export default function ExercisesScreen() {
  const { apiClient } = useAuth();
  const { t } = useI18n();
  const [type, setType] = useState<ExerciseType>();
  const [difficulty, setDifficulty] = useState<Difficulty>();
  const { state, refetch } = useExercises(apiClient, { type, difficulty });

  const TYPE_OPTIONS: ReadonlyArray<{ value: ExerciseType; label: string }> = [
    { value: "CALISTHENICS", label: t("exercises.typeCalisthenics") },
    { value: "GYM", label: t("exercises.typeGym") },
    { value: "SKILL", label: t("exercises.typeSkill") },
  ];

  const DIFFICULTY_OPTIONS: ReadonlyArray<{ value: Difficulty; label: string }> = [
    { value: "BEGINNER", label: t("exercises.difficultyBeginner") },
    { value: "INTERMEDIATE", label: t("exercises.difficultyIntermediate") },
    { value: "ADVANCED", label: t("exercises.difficultyAdvanced") },
  ];

  return (
    <Screen scroll={false}>
      <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">{t("exercises.title")}</Text>

      <View className="gap-3">
        <ChoiceGroup label={t("exercises.typeLabel")} options={TYPE_OPTIONS} value={type} onChange={(v) => setType(v === type ? undefined : v)} />
        <ChoiceGroup
          label={t("exercises.difficultyLabel")}
          options={DIFFICULTY_OPTIONS}
          value={difficulty}
          onChange={(v) => setDifficulty(v === difficulty ? undefined : v)}
        />
      </View>

      {state.status === "loading" ? (
        <Text className="text-center text-neutral-500 dark:text-neutral-600">{t("exercises.loading")}</Text>
      ) : state.status === "error" ? (
        <ErrorState message={state.message} onRetry={refetch} retryLabel={t("common.retry")} />
      ) : state.data.length === 0 ? (
        <Text testID="exercises-empty" className="text-center text-neutral-500 dark:text-neutral-600">
          {t("exercises.empty")}
        </Text>
      ) : (
        <FlatList
          testID="exercises-list"
          data={state.data}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-2 pb-6"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: "/workout", params: { exerciseSlug: item.slug, exerciseName: item.name } })}
              className="gap-1 rounded-lg border border-neutral-700 p-3 dark:border-neutral-400"
            >
              <Text className="font-semibold text-neutral-50 dark:text-neutral-1000">{item.name}</Text>
              <Text className="text-xs text-neutral-500 dark:text-neutral-600">
                {item.category}
                {item.subcategory ? ` · ${item.subcategory}` : ""} · {item.difficulty} · {item.equipment}
              </Text>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
