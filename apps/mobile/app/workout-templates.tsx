import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { ExerciseDto } from "@risesolo/validation";
import { useAuth } from "../src/auth/AuthContext";
import { useExercises } from "../src/exercises/use-exercises";
import { useWorkoutTemplates } from "../src/workouts/use-workout-templates";
import { Button } from "../src/ui/Button";
import { ErrorState } from "../src/ui/ErrorState";
import { Screen } from "../src/ui/Screen";
import { TextField } from "../src/ui/TextField";

export default function WorkoutTemplatesScreen() {
  const { apiClient } = useAuth();
  const { state, refetch } = useWorkoutTemplates(apiClient);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    setActionError(null);
    try {
      await apiClient.workouts.templates.delete(id);
      refetch();
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "Brisanje nije uspelo.");
    } finally {
      setDeletingId(null);
    }
  }

  /**
   * Pokrece POSTOJECI (ne redizajniran) single-exercise workout ekran za
   * PRVU vezbu iz template-a, sa `workoutId` prosledjenim da se sesija
   * poveze sa template-om (vidi apps/mobile/app/workout.tsx). Vodjena
   * sesija kroz SVE vezbe template-a je van obima ove faze - vidi README
   * "Poznata ograničenja".
   */
  async function handleStart(id: string) {
    setStartingId(id);
    setActionError(null);
    try {
      const template = await apiClient.workouts.templates.getById(id);
      const firstExercise = template.exercises[0]?.exercise;
      if (!firstExercise) {
        setActionError("Template nema nijednu vezbu.");
        return;
      }
      router.push({
        pathname: "/workout",
        params: { exerciseSlug: firstExercise.slug, exerciseName: firstExercise.name, workoutId: id },
      });
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "Pokretanje treninga nije uspelo.");
    } finally {
      setStartingId(null);
    }
  }

  if (creating) {
    return (
      <CreateTemplateForm
        apiClient={apiClient}
        onCreated={() => {
          setCreating(false);
          refetch();
        }}
        onCancel={() => setCreating(false)}
      />
    );
  }

  return (
    <Screen>
      <Pressable onPress={() => router.back()} testID="workout-templates-back">
        <Text className="text-accent">{"< Nazad"}</Text>
      </Pressable>

      <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">Moji treninzi</Text>

      <Button label="Novi template" onPress={() => setCreating(true)} testID="new-template-button" />

      {actionError ? <Text className="text-center text-danger">{actionError}</Text> : null}

      {state.status === "loading" ? (
        <Text className="text-neutral-500 dark:text-neutral-600">Ucitavam...</Text>
      ) : state.status === "error" ? (
        <ErrorState message={state.message} onRetry={refetch} testID="workout-templates-error" />
      ) : state.data.length === 0 ? (
        <Text testID="workout-templates-empty" className="text-neutral-500 dark:text-neutral-600">
          Jos uvek nemas sacuvane treninge. Napravi svoj prvi template.
        </Text>
      ) : (
        <View className="gap-2">
          {state.data.map((template) => (
            <View
              key={template.id}
              testID={`workout-template-${template.id}`}
              className="gap-3 rounded-lg border border-neutral-700 p-3 dark:border-neutral-400"
            >
              <View>
                <Text className="font-semibold text-neutral-50 dark:text-neutral-1000">{template.name}</Text>
                <Text className="text-xs text-neutral-500 dark:text-neutral-600">{template.exerciseCount} vezbi</Text>
              </View>
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Button
                    label="Pokreni"
                    onPress={() => void handleStart(template.id)}
                    loading={startingId === template.id}
                    testID={`start-template-${template.id}`}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    label="Obrisi"
                    variant="secondary"
                    onPress={() => void handleDelete(template.id)}
                    loading={deletingId === template.id}
                    testID={`delete-template-${template.id}`}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

function CreateTemplateForm({
  apiClient,
  onCreated,
  onCancel,
}: {
  apiClient: ApiClient;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const { state, refetch } = useExercises(apiClient, {});
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<ExerciseDto[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleExercise(exercise: ExerciseDto) {
    setSelected((current) =>
      current.some((selectedExercise) => selectedExercise.id === exercise.id)
        ? current.filter((selectedExercise) => selectedExercise.id !== exercise.id)
        : [...current, exercise],
    );
  }

  async function handleSave() {
    if (name.trim() === "") {
      setError("Unesi naziv treninga.");
      return;
    }
    if (selected.length === 0) {
      setError("Izaberi bar jednu vezbu.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.workouts.templates.create({
        name: name.trim(),
        exercises: selected.map((exercise) => ({ exerciseId: exercise.id })),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Cuvanje treninga nije uspelo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <Pressable onPress={onCancel} testID="create-template-cancel">
        <Text className="text-accent">{"< Nazad"}</Text>
      </Pressable>

      <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">Novi template</Text>

      <TextField label="Naziv" placeholder="npr. Push dan" value={name} onChangeText={setName} testID="template-name-input" />

      {selected.length > 0 ? (
        <View className="gap-1.5">
          <Text className="text-sm font-semibold text-neutral-400 dark:text-neutral-700">
            IZABRANE VEZBE ({selected.length})
          </Text>
          {selected.map((exercise, index) => (
            <View
              key={exercise.id}
              className="flex-row items-center justify-between rounded-md border border-accent bg-accent/10 px-3 py-2"
            >
              <Text className="text-neutral-50 dark:text-neutral-1000">
                {index + 1}. {exercise.name}
              </Text>
              <Pressable onPress={() => toggleExercise(exercise)} testID={`remove-exercise-${exercise.id}`}>
                <Text className="text-danger">Ukloni</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {error ? <Text className="text-center text-danger">{error}</Text> : null}
      <Button label="Sacuvaj template" onPress={() => void handleSave()} loading={submitting} testID="save-template-button" />

      <Text className="text-sm font-semibold text-neutral-400 dark:text-neutral-700">BAZA VEZBI</Text>
      {state.status === "loading" ? (
        <Text className="text-neutral-500 dark:text-neutral-600">Ucitavam vezbe...</Text>
      ) : state.status === "error" ? (
        <ErrorState message={state.message} onRetry={refetch} />
      ) : (
        <View className="gap-2" testID="template-exercise-catalog">
          {state.data.map((exercise) => {
            const isSelected = selected.some((selectedExercise) => selectedExercise.id === exercise.id);
            return (
              <Pressable
                key={exercise.id}
                onPress={() => toggleExercise(exercise)}
                testID={`toggle-exercise-${exercise.id}`}
                className={`rounded-lg border p-3 ${
                  isSelected ? "border-accent bg-accent/10" : "border-neutral-700 dark:border-neutral-400"
                }`}
              >
                <Text className="font-semibold text-neutral-50 dark:text-neutral-1000">{exercise.name}</Text>
                <Text className="text-xs text-neutral-500 dark:text-neutral-600">
                  {exercise.category} · {exercise.difficulty}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
