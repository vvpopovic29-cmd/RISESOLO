import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import type { PersonalRecordDto, WorkoutHistoryEntryDto, WorkoutHistoryExerciseDto } from "@risesolo/validation";
import { useAuth } from "../src/auth/AuthContext";
import { usePersonalRecords } from "../src/workout/use-personal-records";
import { useWorkoutHistory } from "../src/workout/use-workout-history";
import { ChoiceGroup } from "../src/ui/ChoiceGroup";
import { ErrorState } from "../src/ui/ErrorState";
import { Screen } from "../src/ui/Screen";

type Tab = "history" | "records";

const TAB_OPTIONS: ReadonlyArray<{ value: Tab; label: string }> = [
  { value: "history", label: "Istorija" },
  { value: "records", label: "Rekordi" },
];

export default function WorkoutHistoryScreen() {
  const { apiClient } = useAuth();
  const [tab, setTab] = useState<Tab>("history");

  const history = useWorkoutHistory(apiClient);
  const records = usePersonalRecords(apiClient);

  return (
    <Screen>
      <Pressable onPress={() => router.back()} testID="workout-history-back">
        <Text className="text-accent">{"< Nazad"}</Text>
      </Pressable>

      <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">Istorija treninga</Text>

      <ChoiceGroup label="Prikaz" options={TAB_OPTIONS} value={tab} onChange={setTab} />

      {tab === "history" ? (
        history.state.status === "loading" ? (
          <Text className="text-neutral-500 dark:text-neutral-600">Ucitavam...</Text>
        ) : history.state.status === "error" ? (
          <ErrorState message={history.state.message} onRetry={history.refetch} testID="workout-history-error" />
        ) : history.state.data.length === 0 ? (
          <Text testID="workout-history-empty" className="text-center text-neutral-500 dark:text-neutral-600">
            Jos uvek nemas zavrsen nijedan trening.
          </Text>
        ) : (
          <HistoryList entries={history.state.data} />
        )
      ) : records.state.status === "loading" ? (
        <Text className="text-neutral-500 dark:text-neutral-600">Ucitavam...</Text>
      ) : records.state.status === "error" ? (
        <ErrorState message={records.state.message} onRetry={records.refetch} testID="personal-records-error" />
      ) : records.state.data.length === 0 ? (
        <Text testID="personal-records-empty" className="text-center text-neutral-500 dark:text-neutral-600">
          Jos uvek nemas nijedan licni rekord.
        </Text>
      ) : (
        <RecordsList records={records.state.data} />
      )}
    </Screen>
  );
}

function HistoryList({ entries }: { entries: WorkoutHistoryEntryDto[] }) {
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
              {entry.workoutName ?? "Slobodan trening"}
            </Text>
            <Text className="text-xs text-reward">+{entry.xpGained} XP</Text>
          </View>
          <Text className="text-xs text-neutral-500 dark:text-neutral-600">
            {new Date(entry.completedAt).toLocaleDateString("sr-Latn-RS")}
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
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm text-neutral-400 dark:text-neutral-700">
        {exercise.exerciseName} · {exercise.setCount} {exercise.setCount === 1 ? "serija" : "serije"}
      </Text>
      <Text className="text-sm text-neutral-500 dark:text-neutral-600">{formatBest(exercise)}</Text>
    </View>
  );
}

function RecordsList({ records }: { records: PersonalRecordDto[] }) {
  return (
    <View className="gap-2" testID="personal-records-list">
      {records.map((record) => (
        <View
          key={record.exerciseId}
          testID={`personal-record-${record.exerciseId}`}
          className="flex-row items-center justify-between rounded-lg border border-neutral-700 p-3 dark:border-neutral-400"
        >
          <Text className="font-semibold text-neutral-50 dark:text-neutral-1000">{record.exerciseName}</Text>
          <Text className="text-sm text-reward">{formatBest(record)}</Text>
        </View>
      ))}
    </View>
  );
}

function formatBest(value: { bestReps: number | null; bestDurationSeconds: number | null }): string {
  if (value.bestDurationSeconds !== null) return `${value.bestDurationSeconds}s`;
  if (value.bestReps !== null) return `${value.bestReps} ponavljanja`;
  return "-";
}
