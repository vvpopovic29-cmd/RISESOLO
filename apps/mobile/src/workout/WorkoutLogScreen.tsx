import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { LogWorkoutInput } from "@risesolo/validation";
import { useEvaluateAchievements } from "../achievement/use-evaluate-achievements";
import { useExercises } from "../exercise/use-exercises";
import { useLogWorkout } from "./use-log-workout";

interface DraftSet {
  exerciseId: string;
  exerciseName: string;
  reps: number;
  weightKg: number;
}

/**
 * Bira vezbu preko liste (bez native picker-a - dovoljno za MVP), unosi
 * ponavljanja/tezinu po setu, gomila setove lokalno i tek onda salje ceo
 * trening kroz `logWorkout` (backend racuna PR-ove i XP odjednom, ne po setu).
 */
export function WorkoutLogScreen() {
  const { state: exercisesState, refetch: refetchExercises } = useExercises();
  const { state: logState, submit, reset } = useLogWorkout();
  const {
    state: achievementsState,
    evaluate: evaluateAchievements,
    reset: resetAchievementsState,
  } = useEvaluateAchievements();

  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [reps, setReps] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [sets, setSets] = useState<DraftSet[]>([]);

  const selectedExercise =
    exercisesState.status === "success"
      ? exercisesState.data.find((exercise) => exercise.id === selectedExerciseId)
      : undefined;

  const repsNum = Number(reps);
  const weightNum = Number(weightKg);
  const canAddSet =
    selectedExercise !== undefined &&
    Number.isInteger(repsNum) &&
    repsNum >= 1 &&
    Number.isFinite(weightNum) &&
    weightNum >= 0;

  function addSet() {
    if (!selectedExercise || !canAddSet) {
      return;
    }
    setSets((prev) => [
      ...prev,
      {
        exerciseId: selectedExercise.id,
        exerciseName: selectedExercise.name,
        reps: repsNum,
        weightKg: weightNum,
      },
    ]);
    setReps("");
    setWeightKg("");
  }

  function removeSet(index: number) {
    setSets((prev) => prev.filter((_, i) => i !== index));
  }

  function submitWorkout() {
    if (sets.length === 0) {
      return;
    }
    const input: LogWorkoutInput = {
      sets: sets.map((set) => ({
        exerciseId: set.exerciseId,
        reps: set.reps,
        weightKg: set.weightKg,
      })),
    };
    submit(input);
  }

  function logAnother() {
    setSets([]);
    reset();
    resetAchievementsState();
  }

  useEffect(() => {
    if (logState.status === "success") {
      evaluateAchievements();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pokretanje samo na prelazak u "success", ne na svaku promenu evaluateAchievements reference
  }, [logState.status]);

  if (logState.status === "success") {
    const result = logState.data;
    const newlyUnlocked = achievementsState.status === "success" ? achievementsState.data : [];
    return (
      <View
        testID="workout-log-result"
        className="flex-1 items-center gap-3 bg-neutral-1000 px-6 py-12 dark:bg-neutral-50"
      >
        <Text className="text-2xl font-bold text-success">Trening zabelezen!</Text>
        <Text className="text-neutral-600">
          Level {result.player.level} - {result.player.xp} XP
        </Text>
        {result.restDayWarning ? (
          <Text testID="workout-log-rest-day-warning" className="text-center text-warning">
            Danas je Recovery Day po tvom Training Planu - trening je zabelezen, ali razmisli o
            odmoru za bolji oporavak.
          </Text>
        ) : null}
        {result.personalRecordsCount > 0 ? (
          <View className="items-center gap-1">
            <Text className="font-semibold text-reward">
              {result.personalRecordsCount} novi licni rekord
              {result.personalRecordsCount > 1 ? "a" : ""}!
            </Text>
            {result.newPersonalRecords.map((pr) => (
              <Text key={`${pr.exerciseId}-${pr.weightKg}-${pr.reps}`} className="text-neutral-600">
                {pr.weightKg}kg x {pr.reps}
              </Text>
            ))}
          </View>
        ) : null}
        {newlyUnlocked.length > 0 ? (
          <View testID="workout-log-new-achievements" className="items-center gap-1">
            <Text className="font-semibold text-premium">Novi Achievement!</Text>
            {newlyUnlocked.map((achievement) => (
              <Text key={achievement.id} className="text-neutral-600">
                {achievement.title}
              </Text>
            ))}
          </View>
        ) : null}
        <Pressable
          testID="workout-log-again"
          onPress={logAnother}
          className="rounded-md bg-accent px-4 py-2"
        >
          <Text className="font-semibold text-neutral-50">Zabelezi jos jedan trening</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-neutral-1000 dark:bg-neutral-50">
      <View className="gap-4 px-6 py-12">
        <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">
          Zabelezi trening
        </Text>

        {exercisesState.status === "loading" ? (
          <Text className="text-neutral-600">Ucitavanje vezbi...</Text>
        ) : null}

        {exercisesState.status === "error" ? (
          <View className="gap-2">
            <Text testID="workout-log-exercises-error" className="text-danger">
              Ne mogu da ucitam vezbe: {exercisesState.message}
            </Text>
            <Pressable
              onPress={refetchExercises}
              className="self-start rounded-md border border-neutral-500 px-3 py-1.5"
            >
              <Text className="text-neutral-50 dark:text-neutral-1000">Pokusaj ponovo</Text>
            </Pressable>
          </View>
        ) : null}

        {exercisesState.status === "success" ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-2">
            <View className="flex-row gap-2">
              {exercisesState.data.map((exercise) => (
                <Pressable
                  key={exercise.id}
                  testID={`workout-log-exercise-${exercise.id}`}
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

        <View className="flex-row gap-3">
          <TextInput
            testID="workout-log-reps-input"
            value={reps}
            onChangeText={setReps}
            placeholder="Ponavljanja"
            keyboardType="number-pad"
            className="flex-1 rounded-md border border-neutral-500 px-3 py-2 text-neutral-50 dark:text-neutral-1000"
            placeholderTextColor="#8a8a8a"
          />
          <TextInput
            testID="workout-log-weight-input"
            value={weightKg}
            onChangeText={setWeightKg}
            placeholder="Tezina (kg)"
            keyboardType="decimal-pad"
            className="flex-1 rounded-md border border-neutral-500 px-3 py-2 text-neutral-50 dark:text-neutral-1000"
            placeholderTextColor="#8a8a8a"
          />
        </View>

        <Pressable
          testID="workout-log-add-set"
          onPress={addSet}
          disabled={!canAddSet}
          className={`self-start rounded-md border border-accent px-4 py-2 ${
            canAddSet ? "" : "opacity-50"
          }`}
        >
          <Text className="font-semibold text-accent">Dodaj set</Text>
        </Pressable>

        {sets.length > 0 ? (
          <View testID="workout-log-sets-list" className="gap-2">
            {sets.map((set, index) => (
              <View
                key={`${set.exerciseId}-${index}`}
                testID={`workout-log-set-${index}`}
                className="flex-row items-center justify-between rounded-md border border-neutral-400 px-3 py-2"
              >
                <Text className="text-neutral-50 dark:text-neutral-1000">
                  {set.exerciseName}: {set.reps} x {set.weightKg}kg
                </Text>
                <Pressable
                  testID={`workout-log-remove-set-${index}`}
                  onPress={() => removeSet(index)}
                >
                  <Text className="text-danger">Ukloni</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {logState.status === "error" ? (
          <Text testID="workout-log-error" className="text-danger">
            Ne mogu da sacuvam trening: {logState.message}
          </Text>
        ) : null}

        <Pressable
          testID="workout-log-submit"
          onPress={submitWorkout}
          disabled={sets.length === 0 || logState.status === "submitting"}
          className={`items-center rounded-md bg-accent px-4 py-3 ${
            sets.length === 0 || logState.status === "submitting" ? "opacity-50" : ""
          }`}
        >
          <Text className="font-semibold text-neutral-50">
            {logState.status === "submitting" ? "Cuvanje..." : "Zavrsi trening"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
