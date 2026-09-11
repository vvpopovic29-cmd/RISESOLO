import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { UpdateNutritionTargetsInput } from "@risesolo/validation";
import { useNutritionSummary } from "./use-nutrition-summary";
import { useLogMeal } from "./use-log-meal";
import { useLogWater } from "./use-log-water";
import { useUpdateNutritionTargets } from "./use-update-nutrition-targets";

function toOptionalInt(value: string): number | undefined {
  if (value.trim() === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : undefined;
}

/**
 * Dnevni Nutrition pregled + brzi unos obroka/vode + editor ciljeva. Sva tri
 * podekrana dele isti `refetch` na summary da bi ostali sinhronizovani posle
 * bilo koje mutacije (log/target update).
 */
export function NutritionScreen() {
  const { state: summaryState, refetch: refetchSummary } = useNutritionSummary();
  const { state: mealState, submit: submitMeal, reset: resetMealState } = useLogMeal();
  const { state: waterState, submit: submitWater, reset: resetWaterState } = useLogWater();
  const {
    state: targetsState,
    submit: submitTargets,
    reset: resetTargetsState,
  } = useUpdateNutritionTargets();

  const [mealName, setMealName] = useState("");
  const [mealCalories, setMealCalories] = useState("");
  const [mealProtein, setMealProtein] = useState("");
  const [mealCarbs, setMealCarbs] = useState("");
  const [mealFat, setMealFat] = useState("");

  const [waterAmount, setWaterAmount] = useState("");

  const [editingTargets, setEditingTargets] = useState(false);
  const [calorieTarget, setCalorieTarget] = useState("");
  const [proteinTarget, setProteinTarget] = useState("");
  const [carbTarget, setCarbTarget] = useState("");
  const [fatTarget, setFatTarget] = useState("");
  const [waterTarget, setWaterTarget] = useState("");

  useEffect(() => {
    if (mealState.status === "success") {
      resetMealState();
      setMealName("");
      setMealCalories("");
      setMealProtein("");
      setMealCarbs("");
      setMealFat("");
      refetchSummary();
    }
  }, [mealState, resetMealState, refetchSummary]);

  useEffect(() => {
    if (waterState.status === "success") {
      resetWaterState();
      setWaterAmount("");
      refetchSummary();
    }
  }, [waterState, resetWaterState, refetchSummary]);

  useEffect(() => {
    if (targetsState.status === "success") {
      resetTargetsState();
      setEditingTargets(false);
      refetchSummary();
    }
  }, [targetsState, resetTargetsState, refetchSummary]);

  function handleLogMeal() {
    const calories = Number(mealCalories);
    if (mealName.trim() === "" || !Number.isFinite(calories) || calories < 0) {
      return;
    }
    submitMeal({
      name: mealName.trim(),
      calories: Math.round(calories),
      proteinG: mealProtein.trim() === "" ? 0 : Number(mealProtein),
      carbsG: mealCarbs.trim() === "" ? 0 : Number(mealCarbs),
      fatG: mealFat.trim() === "" ? 0 : Number(mealFat),
    });
  }

  function handleLogWater() {
    const amountMl = Number(waterAmount);
    if (!Number.isInteger(amountMl) || amountMl <= 0) {
      return;
    }
    submitWater({ amountMl });
  }

  function openTargetsEditor() {
    if (summaryState.status === "success") {
      const targets = summaryState.data.targets;
      setCalorieTarget(targets.calorieTarget?.toString() ?? "");
      setProteinTarget(targets.proteinTargetG?.toString() ?? "");
      setCarbTarget(targets.carbTargetG?.toString() ?? "");
      setFatTarget(targets.fatTargetG?.toString() ?? "");
      setWaterTarget(targets.waterTargetMl?.toString() ?? "");
    }
    setEditingTargets(true);
  }

  function handleSaveTargets() {
    const input: UpdateNutritionTargetsInput = {
      calorieTarget: toOptionalInt(calorieTarget) ?? null,
      proteinTargetG: toOptionalInt(proteinTarget) ?? null,
      carbTargetG: toOptionalInt(carbTarget) ?? null,
      fatTargetG: toOptionalInt(fatTarget) ?? null,
      waterTargetMl: toOptionalInt(waterTarget) ?? null,
    };
    submitTargets(input);
  }

  return (
    <ScrollView className="flex-1 bg-neutral-1000 dark:bg-neutral-50">
      <View className="gap-6 px-6 py-12">
        <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">Nutrition</Text>

        {summaryState.status === "loading" ? (
          <Text className="text-neutral-600">Ucitavanje dnevnog pregleda...</Text>
        ) : null}

        {summaryState.status === "error" ? (
          <View className="gap-2">
            <Text testID="nutrition-summary-error" className="text-danger">
              Ne mogu da ucitam pregled: {summaryState.message}
            </Text>
            <Pressable
              onPress={refetchSummary}
              className="self-start rounded-md border border-neutral-500 px-3 py-1.5"
            >
              <Text className="text-neutral-50 dark:text-neutral-1000">Pokusaj ponovo</Text>
            </Pressable>
          </View>
        ) : null}

        {summaryState.status === "success" ? (
          <View testID="nutrition-summary" className="gap-2 rounded-lg border border-accent p-4">
            <Text className="text-neutral-600">
              Kalorije: {summaryState.data.totalCalories}
              {summaryState.data.targets.calorieTarget !== null
                ? ` / ${summaryState.data.targets.calorieTarget}`
                : ""}
            </Text>
            <Text className="text-neutral-600">
              Protein: {summaryState.data.totalProteinG}g
              {summaryState.data.targets.proteinTargetG !== null
                ? ` / ${summaryState.data.targets.proteinTargetG}g`
                : ""}
            </Text>
            <Text className="text-neutral-600">
              Ugljeni hidrati: {summaryState.data.totalCarbsG}g
              {summaryState.data.targets.carbTargetG !== null
                ? ` / ${summaryState.data.targets.carbTargetG}g`
                : ""}
            </Text>
            <Text className="text-neutral-600">
              Masti: {summaryState.data.totalFatG}g
              {summaryState.data.targets.fatTargetG !== null
                ? ` / ${summaryState.data.targets.fatTargetG}g`
                : ""}
            </Text>
            <Text className="text-info">
              Voda: {summaryState.data.totalWaterMl}ml
              {summaryState.data.targets.waterTargetMl !== null
                ? ` / ${summaryState.data.targets.waterTargetMl}ml`
                : ""}
            </Text>

            {summaryState.data.bonusXpGranted ? (
              <Text testID="nutrition-daily-bonus" className="font-semibold text-success">
                Dnevni cilj ispunjen! +100 XP bonus osvojen.
              </Text>
            ) : summaryState.data.dailyGoalMet ? (
              <Text testID="nutrition-daily-goal-met" className="font-semibold text-success">
                Dnevni cilj ispunjen!
              </Text>
            ) : null}

            {editingTargets ? (
              <View className="gap-2 pt-2">
                <TextInput
                  testID="nutrition-targets-calorie-input"
                  value={calorieTarget}
                  onChangeText={setCalorieTarget}
                  placeholder="Cilj - kalorije"
                  keyboardType="number-pad"
                  className="rounded-md border border-neutral-500 px-3 py-2 text-neutral-50 dark:text-neutral-1000"
                  placeholderTextColor="#8a8a8a"
                />
                <TextInput
                  testID="nutrition-targets-protein-input"
                  value={proteinTarget}
                  onChangeText={setProteinTarget}
                  placeholder="Cilj - protein (g)"
                  keyboardType="number-pad"
                  className="rounded-md border border-neutral-500 px-3 py-2 text-neutral-50 dark:text-neutral-1000"
                  placeholderTextColor="#8a8a8a"
                />
                <TextInput
                  testID="nutrition-targets-carb-input"
                  value={carbTarget}
                  onChangeText={setCarbTarget}
                  placeholder="Cilj - ugljeni hidrati (g)"
                  keyboardType="number-pad"
                  className="rounded-md border border-neutral-500 px-3 py-2 text-neutral-50 dark:text-neutral-1000"
                  placeholderTextColor="#8a8a8a"
                />
                <TextInput
                  testID="nutrition-targets-fat-input"
                  value={fatTarget}
                  onChangeText={setFatTarget}
                  placeholder="Cilj - masti (g)"
                  keyboardType="number-pad"
                  className="rounded-md border border-neutral-500 px-3 py-2 text-neutral-50 dark:text-neutral-1000"
                  placeholderTextColor="#8a8a8a"
                />
                <TextInput
                  testID="nutrition-targets-water-input"
                  value={waterTarget}
                  onChangeText={setWaterTarget}
                  placeholder="Cilj - voda (ml)"
                  keyboardType="number-pad"
                  className="rounded-md border border-neutral-500 px-3 py-2 text-neutral-50 dark:text-neutral-1000"
                  placeholderTextColor="#8a8a8a"
                />
                {targetsState.status === "error" ? (
                  <Text testID="nutrition-targets-error" className="text-danger">
                    Ne mogu da sacuvam ciljeve: {targetsState.message}
                  </Text>
                ) : null}
                <View className="flex-row gap-2">
                  <Pressable
                    testID="nutrition-targets-submit"
                    onPress={handleSaveTargets}
                    disabled={targetsState.status === "submitting"}
                    className={`rounded-md bg-accent px-4 py-2 ${
                      targetsState.status === "submitting" ? "opacity-50" : ""
                    }`}
                  >
                    <Text className="font-semibold text-neutral-50">
                      {targetsState.status === "submitting" ? "Cuvanje..." : "Sacuvaj ciljeve"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setEditingTargets(false)}
                    className="rounded-md border border-neutral-500 px-4 py-2"
                  >
                    <Text className="text-neutral-50 dark:text-neutral-1000">Otkazi</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                testID="nutrition-targets-edit-toggle"
                onPress={openTargetsEditor}
                className="self-start rounded-md border border-neutral-500 px-3 py-1.5"
              >
                <Text className="text-neutral-50 dark:text-neutral-1000">Izmeni ciljeve</Text>
              </Pressable>
            )}
          </View>
        ) : null}

        <View className="gap-2 rounded-lg border border-neutral-400 p-4">
          <Text className="font-semibold text-neutral-50 dark:text-neutral-1000">Dodaj obrok</Text>
          <TextInput
            testID="nutrition-meal-name-input"
            value={mealName}
            onChangeText={setMealName}
            placeholder="Naziv obroka"
            className="rounded-md border border-neutral-500 px-3 py-2 text-neutral-50 dark:text-neutral-1000"
            placeholderTextColor="#8a8a8a"
          />
          <TextInput
            testID="nutrition-meal-calories-input"
            value={mealCalories}
            onChangeText={setMealCalories}
            placeholder="Kalorije"
            keyboardType="number-pad"
            className="rounded-md border border-neutral-500 px-3 py-2 text-neutral-50 dark:text-neutral-1000"
            placeholderTextColor="#8a8a8a"
          />
          <View className="flex-row gap-2">
            <TextInput
              testID="nutrition-meal-protein-input"
              value={mealProtein}
              onChangeText={setMealProtein}
              placeholder="Protein (g)"
              keyboardType="decimal-pad"
              className="flex-1 rounded-md border border-neutral-500 px-3 py-2 text-neutral-50 dark:text-neutral-1000"
              placeholderTextColor="#8a8a8a"
            />
            <TextInput
              testID="nutrition-meal-carbs-input"
              value={mealCarbs}
              onChangeText={setMealCarbs}
              placeholder="Ugljeni hidrati (g)"
              keyboardType="decimal-pad"
              className="flex-1 rounded-md border border-neutral-500 px-3 py-2 text-neutral-50 dark:text-neutral-1000"
              placeholderTextColor="#8a8a8a"
            />
            <TextInput
              testID="nutrition-meal-fat-input"
              value={mealFat}
              onChangeText={setMealFat}
              placeholder="Masti (g)"
              keyboardType="decimal-pad"
              className="flex-1 rounded-md border border-neutral-500 px-3 py-2 text-neutral-50 dark:text-neutral-1000"
              placeholderTextColor="#8a8a8a"
            />
          </View>
          {mealState.status === "error" ? (
            <Text testID="nutrition-meal-error" className="text-danger">
              Ne mogu da sacuvam obrok: {mealState.message}
            </Text>
          ) : null}
          <Pressable
            testID="nutrition-meal-submit"
            onPress={handleLogMeal}
            disabled={mealState.status === "submitting"}
            className={`items-center rounded-md bg-accent px-4 py-2 ${
              mealState.status === "submitting" ? "opacity-50" : ""
            }`}
          >
            <Text className="font-semibold text-neutral-50">
              {mealState.status === "submitting" ? "Cuvanje..." : "Dodaj obrok"}
            </Text>
          </Pressable>
        </View>

        <View className="gap-2 rounded-lg border border-neutral-400 p-4">
          <Text className="font-semibold text-neutral-50 dark:text-neutral-1000">Dodaj vodu</Text>
          <TextInput
            testID="nutrition-water-amount-input"
            value={waterAmount}
            onChangeText={setWaterAmount}
            placeholder="Kolicina (ml)"
            keyboardType="number-pad"
            className="rounded-md border border-neutral-500 px-3 py-2 text-neutral-50 dark:text-neutral-1000"
            placeholderTextColor="#8a8a8a"
          />
          {waterState.status === "error" ? (
            <Text testID="nutrition-water-error" className="text-danger">
              Ne mogu da sacuvam vodu: {waterState.message}
            </Text>
          ) : null}
          <Pressable
            testID="nutrition-water-submit"
            onPress={handleLogWater}
            disabled={waterState.status === "submitting"}
            className={`items-center rounded-md bg-info px-4 py-2 ${
              waterState.status === "submitting" ? "opacity-50" : ""
            }`}
          >
            <Text className="font-semibold text-neutral-50">
              {waterState.status === "submitting" ? "Cuvanje..." : "Dodaj vodu"}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
