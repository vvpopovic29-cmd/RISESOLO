import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { ProgressTrend } from "@risesolo/validation";
import { useExercises } from "./use-exercises";
import { useExerciseProgress } from "./use-exercise-progress";

const trendLabels: Record<ProgressTrend, string> = {
  up: "U usponu",
  down: "U padu",
  flat: "Stabilno",
  insufficient_data: "Nedovoljno podataka",
};

const trendColorClasses: Record<ProgressTrend, string> = {
  up: "text-success",
  down: "text-danger",
  flat: "text-warning",
  insufficient_data: "text-neutral-600",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sr-Latn-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Progressive Overload vizuelizacija: bira vezbu, prikazuje procenjeni 1RM
 * (Epley formula, racunat na backendu preko `@risesolo/domain`) po sesiji
 * kao horizontalne trake (relativne u odnosu na najveci 1RM u istoriji) +
 * trend baziran na poslednje dve sesije.
 */
export function ExerciseProgressScreen() {
  const { state: exercisesState } = useExercises();
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const { state: progressState } = useExerciseProgress(selectedExerciseId);

  const maxEstimated1Rm =
    progressState.status === "success"
      ? Math.max(1, ...progressState.data.sessions.map((session) => session.topEstimated1Rm))
      : 1;

  return (
    <ScrollView className="flex-1 bg-neutral-1000 dark:bg-neutral-50">
      <View className="gap-4 px-6 py-12">
        <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">
          Progressive Overload
        </Text>

        {exercisesState.status === "error" ? (
          <Text testID="exercise-progress-exercises-error" className="text-danger">
            Ne mogu da ucitam vezbe: {exercisesState.message}
          </Text>
        ) : null}

        {exercisesState.status === "success" ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {exercisesState.data.map((exercise) => (
                <Pressable
                  key={exercise.id}
                  testID={`exercise-progress-exercise-${exercise.id}`}
                  onPress={() => setSelectedExerciseId(exercise.id)}
                  className={`rounded-md border px-3 py-2 ${
                    selectedExerciseId === exercise.id
                      ? "border-accent bg-accent"
                      : "border-neutral-500"
                  }`}
                >
                  <Text
                    className={
                      selectedExerciseId === exercise.id
                        ? "font-semibold text-neutral-50"
                        : "text-neutral-50 dark:text-neutral-1000"
                    }
                  >
                    {exercise.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        ) : null}

        {progressState.status === "idle" ? (
          <Text className="text-neutral-600">Izaberi vezbu da vidis napredak.</Text>
        ) : null}

        {progressState.status === "loading" ? (
          <Text className="text-neutral-600">Ucitavanje napretka...</Text>
        ) : null}

        {progressState.status === "error" ? (
          <Text testID="exercise-progress-error" className="text-danger">
            Ne mogu da ucitam napredak: {progressState.message}
          </Text>
        ) : null}

        {progressState.status === "success" ? (
          <View testID="exercise-progress-result" className="gap-3">
            <Text className={`font-semibold ${trendColorClasses[progressState.data.trend]}`}>
              Trend: {trendLabels[progressState.data.trend]}
            </Text>

            {progressState.data.sessions.length === 0 ? (
              <Text className="text-neutral-600">Jos nema zabelezenih serija za ovu vezbu.</Text>
            ) : (
              <View className="gap-2">
                {progressState.data.sessions.map((session) => (
                  <View key={session.workoutId} className="gap-1">
                    <View className="flex-row items-baseline justify-between">
                      <Text className="text-neutral-600">{formatDate(session.performedAt)}</Text>
                      <Text className="text-neutral-50 dark:text-neutral-1000">
                        ~{Math.round(session.topEstimated1Rm)}kg 1RM
                      </Text>
                    </View>
                    <View className="h-2 overflow-hidden rounded-full bg-neutral-300">
                      <View
                        className="h-full bg-accent"
                        style={{
                          width: `${Math.round(
                            (session.topEstimated1Rm / maxEstimated1Rm) * 100,
                          )}%`,
                        }}
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
