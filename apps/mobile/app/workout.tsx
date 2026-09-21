import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Link, router, useLocalSearchParams } from "expo-router";
import { ApiError } from "@risesolo/api-client";
import type { CompleteWorkoutResponse, ExerciseDto } from "@risesolo/validation";
import { useAuth } from "../src/auth/AuthContext";
import { useI18n } from "../src/i18n";
import { Button } from "../src/ui/Button";
import { ErrorState } from "../src/ui/ErrorState";
import { Screen } from "../src/ui/Screen";
import { TextField } from "../src/ui/TextField";

interface LoggedSet {
  setNumber: number;
  reps?: number;
  durationSeconds?: number;
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function WorkoutScreen() {
  const params = useLocalSearchParams<{
    exerciseSlug?: string;
    exerciseName?: string;
    workoutId?: string;
    resume?: string;
  }>();
  const exerciseSlug = firstParam(params.exerciseSlug);
  // Opciono - postavljeno kad se trening pokrene iz "Mojih treninga"
  // (vidi apps/mobile/app/workout-templates.tsx), da se sesija poveze sa
  // template-om (WorkoutSession.workoutId, vec podrzano na backend-u).
  const workoutId = firstParam(params.workoutId);
  // Postavljeno kad se ekran otvori preko "Nastavi" bannera na Home-u (vidi
  // apps/mobile/app/home.tsx) - hidrira postojecu pauziranu sesiju umesto
  // da ceka prvu "Dodaj seriju" da pokrene novu.
  const resume = firstParam(params.resume) === "1";
  const { apiClient } = useAuth();
  const { t } = useI18n();

  const [exercise, setExercise] = useState<ExerciseDto | null>(null);
  const [exerciseError, setExerciseError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sets, setSets] = useState<LoggedSet[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [result, setResult] = useState<CompleteWorkoutResponse | null>(null);

  useEffect(() => {
    if (!exerciseSlug) return;
    setExerciseError(null);
    apiClient.exercises
      .getBySlug(exerciseSlug)
      .then(setExercise)
      .catch((error: unknown) => {
        setExerciseError(error instanceof ApiError ? error.message : t("workout.exerciseNotFound"));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t namerno izostavljen, ne treba da retrigeruje fetch
  }, [apiClient, exerciseSlug]);

  useEffect(() => {
    if (!resume) return;
    apiClient.workouts
      .getActiveSession()
      .then((active) => {
        if (!active.session) return;
        setSessionId(active.session.id);
        setSets(
          active.sets.map((set) =>
            set.durationSeconds !== null
              ? { setNumber: set.setNumber, durationSeconds: set.durationSeconds }
              : { setNumber: set.setNumber, reps: set.reps ?? 0 },
          ),
        );
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pokrece se samo jednom pri otvaranju ekrana preko resume=1
  }, []);

  async function handleAbandon() {
    if (!sessionId) return;
    setBusy(true);
    setActionError(null);
    try {
      await apiClient.workouts.abandonSession(sessionId);
      router.dismissTo("/home");
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : t("workout.abandonFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (!exerciseSlug) {
    return (
      <Screen>
        <Text className="text-center text-neutral-500 dark:text-neutral-600">{t("workout.noExerciseSelected")}</Text>
        <Link href="/exercises" className="text-center text-accent">
          {t("workout.goToExerciseLibrary")}
        </Link>
      </Screen>
    );
  }

  if (result) {
    return (
      <Screen>
        <View className="flex-1 justify-center gap-6">
          {/* "System" glow (accent/cyan - vidi packages/design-tokens colors.ts: "System glow, fokus prsten")
              na najvece proslavne trenutke - pulsirajuca accent ivica oko premium sadrzaja. */}
          {result.bossQuestCompleted ? (
            <View
              className="items-center gap-1 rounded-lg border-2 border-accent/60 bg-premium/15 py-6 animate-pulse"
              testID="boss-quest-victory"
            >
              <Text className="text-sm font-semibold text-premium">{t("workout.bossDefeated")}</Text>
              <Text className="text-lg font-bold text-premium">{t("workout.weeklyBossQuestCompleted")}</Text>
            </View>
          ) : null}

          {result.levelUp ? (
            <View className="items-center gap-1 rounded-lg border-2 border-accent/60 bg-premium/15 py-6 animate-pulse">
              <Text className="text-sm font-semibold text-premium">{t("workout.levelUp")}</Text>
              <Text className="text-3xl font-bold text-premium">Level {result.level}</Text>
              {result.statPointsGained > 0 ? (
                <Text className="text-sm text-premium">{t("workout.statPointsGained", { points: result.statPointsGained })}</Text>
              ) : null}
            </View>
          ) : (
            <Text className="text-center text-2xl font-bold text-neutral-50 dark:text-neutral-1000">
              {t("workout.workoutComplete")}
            </Text>
          )}

          <View className="gap-2 rounded-lg border border-neutral-700 p-4 dark:border-neutral-400">
            <ResultRow label={t("workout.xpGained")} value={`+${result.xpGained}`} accent="text-accent" />
            <ResultRow label={t("workout.totalXp")} value={String(result.totalXp)} />
            <ResultRow label={t("workout.coinsGained")} value={`+${result.coinsGained}`} accent="text-reward" />
            <ResultRow label="Streak" value={t("workout.streakDays", { days: result.streak })} accent="text-reward" />
            <ResultRow label={t("workout.dailyQuestLabel")} value={result.questCompleted ? t("workout.completed") : t("workout.notCompleted")} />
            <ResultRow label={t("workout.bossQuestLabel")} value={result.bossQuestCompleted ? t("workout.completed") : t("workout.notCompleted")} />
          </View>

          <Button
            label={t("workout.backToSystem")}
            // dismissTo umesto push/replace - vraca na POSTOJECI /home u stack-u
            // (preskace exercises/workout) umesto da gomila nove istorijske zapise.
            onPress={() => router.dismissTo("/home")}
            testID="workout-back-home"
          />
        </View>
      </Screen>
    );
  }

  if (exerciseError) {
    return (
      <Screen>
        <ErrorState
          message={exerciseError}
          onRetry={() => {
            setExercise(null);
            setExerciseError(null);
          }}
          retryLabel={t("common.retry")}
        />
      </Screen>
    );
  }

  if (!exercise) {
    return (
      <Screen>
        <Text className="text-center text-neutral-500 dark:text-neutral-600">{t("workout.loadingExercise")}</Text>
      </Screen>
    );
  }

  const isHold = exercise.holdSeconds !== null;
  const loadedExercise = exercise;

  async function ensureSession(): Promise<string> {
    if (sessionId) return sessionId;
    const session = await apiClient.workouts.startSession(workoutId ? { workoutId } : {});
    setSessionId(session.id);
    return session.id;
  }

  async function handleAddSet() {
    const amount = Number(inputValue.trim());
    if (!Number.isFinite(amount) || amount <= 0) {
      setActionError(t("workout.invalidSetValue"));
      return;
    }

    setBusy(true);
    setActionError(null);
    try {
      const currentSessionId = await ensureSession();
      const setNumber = sets.length + 1;
      await apiClient.workouts.logSet(currentSessionId, {
        exerciseId: loadedExercise.id,
        setNumber,
        completed: true,
        ...(isHold ? { durationSeconds: amount } : { reps: amount }),
      });
      setSets((current) => [...current, isHold ? { setNumber, durationSeconds: amount } : { setNumber, reps: amount }]);
      setInputValue("");
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : t("workout.setSaveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete() {
    if (!sessionId) return;
    setBusy(true);
    setActionError(null);
    try {
      const response = await apiClient.workouts.complete(sessionId);
      setResult(response);
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : t("workout.completeFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View className="gap-1">
        <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">{exercise.name}</Text>
        <Text className="text-sm text-neutral-500 dark:text-neutral-600">
          {exercise.category}
          {exercise.subcategory ? ` · ${exercise.subcategory}` : ""} · {exercise.difficulty}
        </Text>
      </View>

      {exercise.instructions[0] ? (
        <Text className="text-neutral-400 dark:text-neutral-700">{exercise.instructions[0]}</Text>
      ) : null}

      {sets.length > 0 ? (
        <View className="gap-1.5">
          <Text className="text-sm font-semibold text-neutral-400 dark:text-neutral-700">{t("workout.completedSetsHeader")}</Text>
          {sets.map((set) => (
            <View
              key={set.setNumber}
              className="flex-row items-center justify-between rounded-md border border-neutral-700 px-3 py-2 dark:border-neutral-400"
            >
              <Text className="text-neutral-50 dark:text-neutral-1000">{t("workout.setNumber", { number: set.setNumber })}</Text>
              <Text className="text-neutral-500 dark:text-neutral-600">
                {isHold ? `${set.durationSeconds}s` : t("workout.reps", { count: set.reps ?? 0 })}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <TextField
        label={
          isHold
            ? t("workout.durationLabel")
            : exercise.defaultReps
              ? t("workout.repsLabelSuggested", { suggested: exercise.defaultReps })
              : t("workout.repsLabel")
        }
        value={inputValue}
        onChangeText={setInputValue}
        keyboardType="number-pad"
        testID="workout-set-input"
      />

      {actionError ? <Text className="text-center text-danger">{actionError}</Text> : null}

      <View className="gap-3">
        <Button label={t("workout.addSet")} variant="secondary" onPress={() => void handleAddSet()} loading={busy} testID="add-set-button" />
        <Button
          label={t("workout.finishWorkout")}
          onPress={() => void handleComplete()}
          loading={busy}
          disabled={sets.length === 0}
          testID="complete-workout-button"
        />
        {sessionId ? (
          <>
            {/* Sesija je vec sacuvana na serveru (svaka "Dodaj seriju" je persistovana) -
                napustanje ekrana bez API poziva je dovoljno za pauzu, Home banner je nastavlja. */}
            <Button
              label={t("workout.pause")}
              variant="secondary"
              onPress={() => router.dismissTo("/home")}
              testID="pause-workout-button"
            />
            <Button
              label={t("workout.abandonWorkout")}
              variant="secondary"
              onPress={() => void handleAbandon()}
              loading={busy}
              testID="abandon-workout-button"
            />
          </>
        ) : null}
      </View>
    </Screen>
  );
}

function ResultRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-neutral-500 dark:text-neutral-600">{label}</Text>
      <Text className={`font-semibold text-neutral-50 dark:text-neutral-1000 ${accent ?? ""}`}>{value}</Text>
    </View>
  );
}
