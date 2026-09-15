import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { ApiError } from "@risesolo/api-client";
import type { NutritionEntryDto } from "@risesolo/validation";
import { useAuth } from "../src/auth/AuthContext";
import { useNutritionDay } from "../src/nutrition/use-nutrition-day";
import { Button } from "../src/ui/Button";
import { ChoiceGroup } from "../src/ui/ChoiceGroup";
import { ErrorState } from "../src/ui/ErrorState";
import { Screen } from "../src/ui/Screen";
import { TextField } from "../src/ui/TextField";

const MEAL_TYPE_OPTIONS: ReadonlyArray<{ value: NutritionEntryDto["mealType"]; label: string }> = [
  { value: "BREAKFAST", label: "Dorucak" },
  { value: "LUNCH", label: "Rucak" },
  { value: "DINNER", label: "Vecera" },
  { value: "SNACK", label: "Uzina" },
];

const MEAL_TYPE_LABEL: Record<NutritionEntryDto["mealType"], string> = {
  BREAKFAST: "Dorucak",
  LUNCH: "Rucak",
  DINNER: "Vecera",
  SNACK: "Uzina",
};

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
  const { state, refetch } = useNutritionDay(apiClient);

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
      setFormError("Unesi naziv obroka.");
      return;
    }
    const parsedCalories = parseMacro(calories);
    const parsedProtein = parseMacro(proteinG);
    const parsedCarbs = parseMacro(carbsG);
    const parsedFat = parseMacro(fatG);
    if ([parsedCalories, parsedProtein, parsedCarbs, parsedFat].some(Number.isNaN)) {
      setFormError("Unesi validne brojeve vece ili jednake 0.");
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
      setFormError(error instanceof ApiError ? error.message : "Cuvanje unosa nije uspelo.");
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
        <Text className="text-accent">{"< Nazad"}</Text>
      </Pressable>

      <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">Ishrana</Text>

      {state.status === "loading" ? (
        <Text className="text-neutral-500 dark:text-neutral-600">Ucitavam...</Text>
      ) : state.status === "error" ? (
        <ErrorState message={state.message} onRetry={refetch} />
      ) : (
        <View
          testID="nutrition-totals"
          className="flex-row flex-wrap justify-between gap-y-2 rounded-lg border border-neutral-700 p-4 dark:border-neutral-400"
        >
          <MacroCell label="Kalorije" value={state.data.totals.calories} />
          <MacroCell label="Protein (g)" value={state.data.totals.proteinG} />
          <MacroCell label="UH (g)" value={state.data.totals.carbsG} />
          <MacroCell label="Masti (g)" value={state.data.totals.fatG} />
        </View>
      )}

      <View className="gap-3 rounded-lg border border-neutral-700 p-4 dark:border-neutral-400">
        <ChoiceGroup label="Obrok" options={MEAL_TYPE_OPTIONS} value={mealType} onChange={setMealType} />
        <TextField label="Naziv" placeholder="npr. Ovsena kasa sa bananom" value={name} onChangeText={setName} testID="nutrition-name-input" />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <TextField label="Kalorije" value={calories} onChangeText={setCalories} keyboardType="number-pad" testID="nutrition-calories-input" />
          </View>
          <View className="flex-1">
            <TextField label="Protein (g)" value={proteinG} onChangeText={setProteinG} keyboardType="number-pad" />
          </View>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <TextField label="UH (g)" value={carbsG} onChangeText={setCarbsG} keyboardType="number-pad" />
          </View>
          <View className="flex-1">
            <TextField label="Masti (g)" value={fatG} onChangeText={setFatG} keyboardType="number-pad" />
          </View>
        </View>
        {formError ? <Text className="text-danger">{formError}</Text> : null}
        <Button label="Dodaj unos" onPress={() => void handleAddEntry()} loading={submitting} testID="add-nutrition-entry-button" />
      </View>

      <View className="gap-2">
        <Text className="text-sm font-semibold text-neutral-400 dark:text-neutral-700">DANASNJI UNOSI</Text>
        {state.status === "success" && state.data.entries.length === 0 ? (
          <Text testID="nutrition-entries-empty" className="text-neutral-500 dark:text-neutral-600">
            Jos uvek nema unosa za danas.
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
                    {entry.calories} kcal · {entry.proteinG}p / {entry.carbsG}u / {entry.fatG}m
                  </Text>
                </View>
                <Button
                  label="Obrisi"
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
