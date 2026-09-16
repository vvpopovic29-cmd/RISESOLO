import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { ApiError } from "@risesolo/api-client";
import type { TrainingPlanDetailDto } from "@risesolo/validation";
import { useAuth } from "../src/auth/AuthContext";
import { useTrainingPlans } from "../src/training/use-training-plans";
import { Button } from "../src/ui/Button";
import { ChoiceGroup } from "../src/ui/ChoiceGroup";
import { ErrorState } from "../src/ui/ErrorState";
import { Screen } from "../src/ui/Screen";
import { TextField } from "../src/ui/TextField";

const DAYS_PER_WEEK_OPTIONS = ["2", "3", "4", "5", "6"].map((value) => ({ value, label: `${value}x` }));

export default function TrainingPlanScreen() {
  const { apiClient } = useAuth();
  const { state: plansState, refetch: refetchPlans } = useTrainingPlans(apiClient);

  const [daysPerWeek, setDaysPerWeek] = useState("3");
  const [goal, setGoal] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  const [detail, setDetail] = useState<TrainingPlanDetailDto | null>(null);
  const [detailPlanId, setDetailPlanId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  async function loadDetail(id: string) {
    setDetailPlanId(id);
    setDetailLoading(true);
    setDetailError(null);
    try {
      const plan = await apiClient.trainingPlans.getById(id);
      setDetail(plan);
    } catch (error) {
      setDetailError(error instanceof ApiError ? error.message : "Plan nije pronadjen.");
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setDetail(null);
    setDetailPlanId(null);
    setDetailError(null);
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenerateError(null);
    setLimitReached(false);
    try {
      const plan = await apiClient.trainingPlans.generate({
        daysPerWeek: Number(daysPerWeek),
        ...(goal.trim() ? { goal: goal.trim() } : {}),
      });
      setDetail(plan);
      refetchPlans();
    } catch (error) {
      // 402 = besplatni limit dostignut (vidi apps/api training-plans.service.ts) - paywall, ne generalna greska.
      if (error instanceof ApiError && error.status === 402) {
        setLimitReached(true);
      } else {
        setGenerateError(error instanceof ApiError ? error.message : "Generisanje plana nije uspelo.");
      }
    } finally {
      setGenerating(false);
    }
  }

  if (detailLoading) {
    return (
      <Screen>
        <Text className="text-center text-neutral-500 dark:text-neutral-600">Ucitavam plan...</Text>
      </Screen>
    );
  }

  if (detailError) {
    return (
      <Screen>
        <ErrorState message={detailError} onRetry={() => detailPlanId && void loadDetail(detailPlanId)} />
        <Button label="Nazad na planove" variant="secondary" onPress={closeDetail} />
      </Screen>
    );
  }

  if (detail) {
    return (
      <Screen>
        <Pressable onPress={closeDetail} testID="training-plan-back">
          <Text className="text-accent">{"< Nazad na planove"}</Text>
        </Pressable>

        <View className="gap-1">
          <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">{detail.title}</Text>
          {detail.summary ? (
            <Text className="text-sm text-neutral-500 dark:text-neutral-600">{detail.summary}</Text>
          ) : null}
        </View>

        <View className="gap-4">
          {detail.content.days.map((day) => (
            <View key={day.day} className="gap-2 rounded-lg border border-neutral-700 p-4 dark:border-neutral-400">
              <Text className="text-sm font-semibold text-neutral-400 dark:text-neutral-700">
                DAN {day.day} · {day.focus.toUpperCase()}
              </Text>
              {day.exercises.map((exercise) => (
                <View
                  key={exercise.exerciseSlug}
                  className="flex-row items-center justify-between border-t border-neutral-700 pt-2 dark:border-neutral-400"
                >
                  <Text className="flex-1 text-neutral-50 dark:text-neutral-1000">
                    {exercise.exercise?.name ?? exercise.exerciseSlug}
                  </Text>
                  <Text className="text-neutral-500 dark:text-neutral-600">
                    {exercise.sets} x {exercise.reps}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Pressable onPress={() => router.back()} testID="training-plan-close">
        <Text className="text-accent">{"< Nazad"}</Text>
      </Pressable>

      <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">AI trening plan</Text>

      <View className="gap-3 rounded-lg border border-neutral-700 p-4 dark:border-neutral-400">
        <ChoiceGroup
          label="Treninga nedeljno"
          options={DAYS_PER_WEEK_OPTIONS}
          value={daysPerWeek}
          onChange={setDaysPerWeek}
        />
        <TextField
          label="Cilj (opciono)"
          placeholder="npr. vise snage u guranju"
          value={goal}
          onChangeText={setGoal}
          testID="training-plan-goal-input"
        />
        {generateError ? <Text className="text-danger">{generateError}</Text> : null}
        {limitReached ? (
          <View className="gap-2 rounded-lg border border-premium/40 bg-premium/10 p-3" testID="training-plan-limit-banner">
            <Text className="text-sm font-semibold text-premium">Dostigao si besplatni limit AI planova</Text>
            <Text className="text-xs text-neutral-400 dark:text-neutral-700">
              Nadogradi na RISESOLO Pro za neograniceno generisanje trening planova.
            </Text>
            <Button label="Pogledaj RISESOLO Pro" onPress={() => router.push("/paywall")} testID="upgrade-to-pro-button" />
          </View>
        ) : null}
        <Button
          label="Generisi plan"
          onPress={() => void handleGenerate()}
          loading={generating}
          testID="generate-training-plan-button"
        />
      </View>

      <View className="gap-2">
        <Text className="text-sm font-semibold text-neutral-400 dark:text-neutral-700">PRETHODNI PLANOVI</Text>
        {plansState.status === "loading" ? (
          <Text className="text-neutral-500 dark:text-neutral-600">Ucitavam...</Text>
        ) : plansState.status === "error" ? (
          <ErrorState message={plansState.message} onRetry={refetchPlans} />
        ) : plansState.data.length === 0 ? (
          <Text testID="training-plans-empty" className="text-neutral-500 dark:text-neutral-600">
            Jos uvek nemas generisan plan.
          </Text>
        ) : (
          plansState.data.map((plan) => (
            <Pressable
              key={plan.id}
              onPress={() => void loadDetail(plan.id)}
              className="gap-1 rounded-lg border border-neutral-700 p-3 dark:border-neutral-400"
            >
              <Text className="font-semibold text-neutral-50 dark:text-neutral-1000">{plan.title}</Text>
              <Text className="text-xs text-neutral-500 dark:text-neutral-600">{plan.daysPerWeek}x nedeljno</Text>
            </Pressable>
          ))
        )}
      </View>
    </Screen>
  );
}
