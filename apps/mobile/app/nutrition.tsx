import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { ApiError } from "@risesolo/api-client";
import type { NutritionEntryDto } from "@risesolo/validation";
import { useAuth } from "../src/auth/AuthContext";
import { useI18n } from "../src/i18n";
import { useNutritionDay } from "../src/nutrition/use-nutrition-day";
import { Button } from "../src/ui/Button";
import { ChoiceGroup } from "../src/ui/ChoiceGroup";
import { ErrorState } from "../src/ui/ErrorState";
import { Screen } from "../src/ui/Screen";
import { TextField } from "../src/ui/TextField";

/** Prazan string -> undefined; inace nenegativan ceo broj (0 ako je unos nevalidan). */
function parseMacro(text: string): number {
  const trimmed = text.trim();
  if (trimmed === "") return 0;
  const parsed = Math.round(Number(trimmed));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : Number.NaN;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NutritionScreen() {
  const { apiClient } = useAuth();
  const { t } = useI18n();
  const { state, refetch } = useNutritionDay(apiClient);

  const MEAL_TYPE_OPTIONS: ReadonlyArray<{ value: NutritionEntryDto["mealType"]; label: string }> = [
    { value: "BREAKFAST", label: t("nutrition.mealBreakfast") },
    { value: "LUNCH", label: t("nutrition.mealLunch") },
    { value: "DINNER", label: t("nutrition.mealDinner") },
    { value: "SNACK", label: t("nutrition.mealSnack") },
  ];

  const MEAL_TYPE_LABEL: Record<NutritionEntryDto["mealType"], string> = {
    BREAKFAST: t("nutrition.mealBreakfast"),
    LUNCH: t("nutrition.mealLunch"),
    DINNER: t("nutrition.mealDinner"),
    SNACK: t("nutrition.mealSnack"),
  };

  const [mealType, setMealType] = useState<NutritionEntryDto["mealType"]>("BREAKFAST");
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [fatG, setFatG] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAddEntry() {
    if (name.trim() === "") {
      setFormError(t("nutrition.nameRequired"));
      return;
    }
    const parsedCalories = parseMacro(calories);
    const parsedProtein = parseMacro(proteinG);
    const parsedCarbs = parseMacro(carbsG);
    const parsedFat = parseMacro(fatG);
    if ([parsedCalories, parsedProtein, parsedCarbs, parsedFat].some(Number.isNaN)) {
      setFormError(t("nutrition.invalidNumbers"));
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await apiClient.nutrition.createEntry({
        date: todayIsoDate(),
        mealType,
        name: name.trim(),
        calories: parsedCalories,
        proteinG: parsedProtein,
        carbsG: parsedCarbs,
        fatG: parsedFat,
      });
      setName("");
      setCalories("");
      setProteinG("");
      setCarbsG("");
      setFatG("");
      refetch();
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t("nutrition.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await apiClient.nutrition.deleteEntry(id);
      refetch();
    } catch {
      // Neuspesno brisanje - unos ostaje vidljiv, korisnik moze da pokusa ponovo.
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Screen>
      <Pressable onPress={() => router.back()} testID="nutrition-back">
        <Text className="text-accent">{t("common.back")}</Text>
      </Pressable>

      <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">{t("nutrition.title")}</Text>

      {state.status === "loading" ? (
        <Text className="text-neutral-500 dark:text-neutral-600">{t("common.loading")}</Text>
      ) : state.status === "error" ? (
        <ErrorState message={state.message} onRetry={refetch} retryLabel={t("common.retry")} />
      ) : (
        <View
          testID="nutrition-totals"
          className="flex-row flex-wrap justify-between gap-y-2 rounded-lg border border-neutral-700 p-4 dark:border-neutral-400"
        >
          <MacroCell label={t("nutrition.totalCalories")} value={state.data.totals.calories} />
          <MacroCell label={t("nutrition.totalProtein")} value={state.data.totals.proteinG} />
          <MacroCell label={t("nutrition.totalCarbs")} value={state.data.totals.carbsG} />
          <MacroCell label={t("nutrition.totalFat")} value={state.data.totals.fatG} />
        </View>
      )}

      <View className="gap-3 rounded-lg border border-neutral-700 p-4 dark:border-neutral-400">
        <ChoiceGroup label={t("nutrition.mealLabel")} options={MEAL_TYPE_OPTIONS} value={mealType} onChange={setMealType} />
        <TextField
          label={t("nutrition.nameLabel")}
          placeholder={t("nutrition.namePlaceholder")}
          value={name}
          onChangeText={setName}
          testID="nutrition-name-input"
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <TextField
              label={t("nutrition.totalCalories")}
              value={calories}
              onChangeText={setCalories}
              keyboardType="number-pad"
              testID="nutrition-calories-input"
            />
          </View>
          <View className="flex-1">
            <TextField label={t("nutrition.totalProtein")} value={proteinG} onChangeText={setProteinG} keyboardType="number-pad" />
          </View>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <TextField label={t("nutrition.totalCarbs")} value={carbsG} onChangeText={setCarbsG} keyboardType="number-pad" />
          </View>
          <View className="flex-1">
            <TextField label={t("nutrition.totalFat")} value={fatG} onChangeText={setFatG} keyboardType="number-pad" />
          </View>
        </View>
        {formError ? <Text className="text-danger">{formError}</Text> : null}
        <Button label={t("nutrition.addEntry")} onPress={() => void handleAddEntry()} loading={submitting} testID="add-nutrition-entry-button" />
      </View>

      <View className="gap-2">
        <Text className="text-sm font-semibold text-neutral-400 dark:text-neutral-700">{t("nutrition.todayEntries")}</Text>
        {state.status === "success" && state.data.entries.length === 0 ? (
          <Text testID="nutrition-entries-empty" className="text-neutral-500 dark:text-neutral-600">
            {t("nutrition.entriesEmpty")}
          </Text>
        ) : null}
        {state.status === "success"
          ? state.data.entries.map((entry) => (
              <View
                key={entry.id}
                className="flex-row items-center justify-between gap-2 rounded-lg border border-neutral-700 p-3 dark:border-neutral-400"
              >
                <View className="flex-1 gap-0.5">
                  <Text className="text-xs text-neutral-500 dark:text-neutral-600">{MEAL_TYPE_LABEL[entry.mealType]}</Text>
                  <Text className="font-semibold text-neutral-50 dark:text-neutral-1000">{entry.name}</Text>
                  <Text className="text-xs text-neutral-500 dark:text-neutral-600">
                    {t("nutrition.entrySummary", {
                      calories: entry.calories,
                      protein: entry.proteinG,
                      carbs: entry.carbsG,
                      fat: entry.fatG,
                    })}
                  </Text>
                </View>
                <Button
                  label={t("nutrition.delete")}
                  variant="secondary"
                  onPress={() => void handleDelete(entry.id)}
                  loading={deletingId === entry.id}
                  testID={`delete-nutrition-entry-${entry.id}`}
                />
              </View>
            ))
          : null}
      </View>
    </Screen>
  );
}

function MacroCell({ label, value }: { label: string; value: number }) {
  return (
    <View className="w-[47%] gap-0.5">
      <Text className="text-xs text-neutral-500 dark:text-neutral-600">{label}</Text>
      <Text className="text-lg font-semibold text-neutral-50 dark:text-neutral-1000">{value}</Text>
    </View>
  );
}
