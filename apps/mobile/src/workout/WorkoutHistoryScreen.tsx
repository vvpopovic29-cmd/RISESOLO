import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useExercises } from "../exercise/use-exercises";
import { useWorkoutDetail } from "./use-workout-detail";
import { useWorkouts } from "./use-workouts";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sr-Latn-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Zatvara postojecu prazninu: `listWorkouts`/`getWorkout` postoje u api-client-u od Faze 2, ali nijedan ekran ih nije koristio - korisnik nije mogao da vidi istoriju treninga, samo da ih beleži. */
export function WorkoutHistoryScreen() {
  const { state: workoutsState, refetch: refetchWorkouts } = useWorkouts();
  const { state: exercisesState } = useExercises();
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const { state: detailState } = useWorkoutDetail(selectedWorkoutId);

  const exerciseNameById = useMemo(() => {
    const map = new Map<string, string>();
    if (exercisesState.status === "success") {
      for (const exercise of exercisesState.data) {
        map.set(exercise.id, exercise.name);
      }
    }
    return map;
  }, [exercisesState]);

  return (
    <ScrollView className="flex-1 bg-neutral-1000 dark:bg-neutral-50">
      <View className="gap-4 px-6 py-12">
        <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">
          Istorija treninga
        </Text>

        {workoutsState.status === "loading" ? (
          <Text className="text-neutral-600">Ucitavanje istorije...</Text>
        ) : null}

        {workoutsState.status === "error" ? (
          <View className="gap-2">
            <Text testID="workout-history-error" className="text-danger">
              Ne mogu da ucitam istoriju: {workoutsState.message}
            </Text>
            <Pressable
              onPress={refetchWorkouts}
              className="self-start rounded-md border border-neutral-500 px-3 py-1.5"
            >
              <Text className="text-neutral-50 dark:text-neutral-1000">Pokusaj ponovo</Text>
            </Pressable>
          </View>
        ) : null}

        {workoutsState.status === "success" && workoutsState.data.length === 0 ? (
          <Text className="text-neutral-600">Jos nema zabelezenih treninga.</Text>
        ) : null}

        {workoutsState.status === "success" ? (
          <View testID="workout-history-list" className="gap-2">
            {workoutsState.data.map((workout) => (
              <Pressable
                key={workout.id}
                testID={`workout-history-item-${workout.id}`}
                onPress={() => setSelectedWorkoutId(workout.id)}
                className={`gap-1 rounded-md border p-3 ${
                  selectedWorkoutId === workout.id ? "border-accent" : "border-neutral-400"
                }`}
              >
                <Text className="font-semibold text-neutral-50 dark:text-neutral-1000">
                  {formatDate(workout.performedAt)}
                </Text>
                {workout.notes ? <Text className="text-neutral-600">{workout.notes}</Text> : null}
              </Pressable>
            ))}
          </View>
        ) : null}

        {detailState.status === "loading" ? (
          <Text className="text-neutral-600">Ucitavanje detalja...</Text>
        ) : null}

        {detailState.status === "error" ? (
          <Text testID="workout-history-detail-error" className="text-danger">
            Ne mogu da ucitam detalje: {detailState.message}
          </Text>
        ) : null}

        {detailState.status === "success" ? (
          <View
            testID="workout-history-detail"
            className="gap-2 rounded-lg border border-accent p-4"
          >
            <Text className="text-xs uppercase tracking-wide text-accent">Detalji treninga</Text>
            {(detailState.data.sets ?? []).map((set) => (
              <View
                key={set.id}
                className="flex-row items-center justify-between border-b border-neutral-400 py-1"
              >
                <Text className="text-neutral-50 dark:text-neutral-1000">
                  {exerciseNameById.get(set.exerciseId) ?? set.exerciseId}
                </Text>
                <Text className="text-neutral-600">
                  {set.reps} x {set.weightKg}kg
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
