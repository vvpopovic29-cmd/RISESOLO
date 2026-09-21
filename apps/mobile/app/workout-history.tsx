import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import type { PersonalRecordDto, WorkoutHistoryEntryDto, WorkoutHistoryExerciseDto } from "@risesolo/validation";
import { useAuth } from "../src/auth/AuthContext";
import { usePersonalRecords } from "../src/workout/use-personal-records";
import { useWorkoutHistory } from "../src/workout/use-workout-history";
import { useI18n } from "../src/i18n";
import { ChoiceGroup } from "../src/ui/ChoiceGroup";
import { ErrorState } from "../src/ui/ErrorState";
import { Screen } from "../src/ui/Screen";

type Tab = "history" | "records";

export default function WorkoutHistoryScreen() {
  const { apiClient } = useAuth();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("history");

  const history = useWorkoutHistory(apiClient);
  const records = usePersonalRecords(apiClient);

  const TAB_OPTIONS: ReadonlyArray<{ value: Tab; label: string }> = [
    { value: "history", label: t("workoutHistory.tabHistory") },
    { value: "records", label: t("workoutHistory.tabRecords") },
  ];

  return (
    <Screen>
      <Pressable onPress={() => router.back()} testID="workout-history-back">
        <Text className="text-accent">{t("common.back")}</Text>
      </Pressable>

      <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">{t("workoutHistory.title")}</Text>

      <ChoiceGroup label={t("workoutHistory.viewLabel")} options={TAB_OPTIONS} value={tab} onChange={setTab} />

      {tab === "history" ? (
        history.state.status === "loading" ? (
          <Text className="text-neutral-500 dark:text-neutral-600">{t("common.loading")}</Text>
        ) : history.state.status === "error" ? (
          <ErrorState message={history.state.message} onRetry={history.refetch} retryLabel={t("common.retry")} testID="workout-history-error" />
        ) : history.state.data.length === 0 ? (
          <Text testID="workout-history-empty" className="text-center text-neutral-500 dark:text-neutral-600">
            {t("workoutHistory.historyEmpty")}
          </Text>
        ) : (
          <HistoryList entries={history.state.data} />
        )
      ) : records.state.status === "loading" ? (
        <Text className="text-neutral-500 dark:text-neutral-600">{t("common.loading")}</Text>
      ) : records.state.status === "error" ? (
        <ErrorState message={records.state.message} onRetry={records.refetch} retryLabel={t("common.retry")} testID="personal-records-error" />
      ) : records.state.data.length === 0 ? (
        <Text testID="personal-records-empty" className="text-center text-neutral-500 dark:text-neutral-600">
          {t("workoutHistory.recordsEmpty")}
        </Text>
      ) : (
        <RecordsList records={records.state.data} />
      )}
    </Screen>
  );
}

function HistoryList({ entries }: { entries: WorkoutHistoryEntryDto[] }) {
  const { t, locale } = useI18n();
  return (
    <View className="gap-3" testID="workout-history-list">
      {entries.map((entry) => (
        <View
          key={entry.id}
          testID={`workout-history-entry-${entry.id}`}
          className="gap-2 rounded-lg border border-neutral-700 p-3 dark:border-neutral-400"
        >
          <View className="flex-row items-center justify-between">
            <Text className="font-semibold text-neutral-50 dark:text-neutral-1000">
              {entry.workoutName ?? t("workoutHistory.freeWorkout")}
            </Text>
            <Text className="text-xs text-reward">+{entry.xpGained} XP</Text>
          </View>
          <Text className="text-xs text-neutral-500 dark:text-neutral-600">
            {new Date(entry.completedAt).toLocaleDateString(locale === "en" ? "en-US" : "sr-Latn-RS")}
          </Text>
          {entry.exercises.map((exercise) => (
            <ExerciseSummaryRow key={exercise.exerciseId} exercise={exercise} />
          ))}
        </View>
      ))}
    </View>
  );
}

function ExerciseSummaryRow({ exercise }: { exercise: WorkoutHistoryExerciseDto }) {
  const { t } = useI18n();
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm text-neutral-400 dark:text-neutral-700">
        {exercise.exerciseName} ·{" "}
        {t(exercise.setCount === 1 ? "workoutHistory.setsCountOne" : "workoutHistory.setsCountOther", { count: exercise.setCount })}
      </Text>
      <Text className="text-sm text-neutral-500 dark:text-neutral-600">{formatBest(exercise, t)}</Text>
    </View>
  );
}

function RecordsList({ records }: { records: PersonalRecordDto[] }) {
  const { t } = useI18n();
  return (
    <View className="gap-2" testID="personal-records-list">
      {records.map((record) => (
        <View
          key={record.exerciseId}
          testID={`personal-record-${record.exerciseId}`}
          className="flex-row items-center justify-between rounded-lg border border-neutral-700 p-3 dark:border-neutral-400"
        >
          <Text className="font-semibold text-neutral-50 dark:text-neutral-1000">{record.exerciseName}</Text>
          <Text className="text-sm text-reward">{formatBest(record, t)}</Text>
        </View>
      ))}
    </View>
  );
}

function formatBest(value: { bestReps: number | null; bestDurationSeconds: number | null }, t: ReturnType<typeof useI18n>["t"]): string {
  if (value.bestDurationSeconds !== null) return `${value.bestDurationSeconds}s`;
  if (value.bestReps !== null) return t("workoutHistory.reps", { count: value.bestReps });
  return "-";
}
