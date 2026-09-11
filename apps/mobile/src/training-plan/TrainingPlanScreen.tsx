import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { DayFocus, SplitType } from "@risesolo/validation";
import { useTrainingPlan } from "./use-training-plan";
import { useUpdateTrainingPlan } from "./use-update-training-plan";

const splitLabels: Record<SplitType, string> = {
  push_pull_legs: "Push/Pull/Legs",
  upper_lower: "Upper/Lower",
  full_body: "Full Body",
};

const dayLabels = ["Pon", "Uto", "Sre", "Cet", "Pet", "Sub", "Ned"];

const focusLabels: Record<DayFocus, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Noge",
  upper: "Gornji deo tela",
  lower: "Donji deo tela",
  full_body: "Celo telo",
  rest: "Odmor",
};

/**
 * Split se bira, a 7-dnevni raspored se uvek izvodi na backendu preko
 * `@risesolo/domain` (training.generateWeeklySchedule) - ekran ga samo
 * prikazuje, nikad ga sam ne racuna niti salje.
 */
export function TrainingPlanScreen() {
  const { state: planState, refetch: refetchPlan } = useTrainingPlan();
  const { state: updateState, submit, reset: resetUpdateState } = useUpdateTrainingPlan();

  const [selectedSplitType, setSelectedSplitType] = useState<SplitType>("push_pull_legs");
  const [daysPerWeek, setDaysPerWeek] = useState(3);

  useEffect(() => {
    if (planState.status === "success" && planState.data.splitType !== null) {
      setSelectedSplitType(planState.data.splitType);
      setDaysPerWeek(planState.data.daysPerWeek ?? 3);
    }
  }, [planState]);

  useEffect(() => {
    if (updateState.status === "success") {
      resetUpdateState();
      refetchPlan();
    }
  }, [updateState, resetUpdateState, refetchPlan]);

  function handleSave() {
    submit({ splitType: selectedSplitType, daysPerWeek });
  }

  const schedule = planState.status === "success" ? planState.data.schedule : null;

  return (
    <ScrollView className="flex-1 bg-neutral-1000 dark:bg-neutral-50">
      <View className="gap-6 px-6 py-12">
        <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">
          Training Plan
        </Text>

        {planState.status === "loading" ? (
          <Text className="text-neutral-600">Ucitavanje plana...</Text>
        ) : null}

        {planState.status === "error" ? (
          <View className="gap-2">
            <Text testID="training-plan-error" className="text-danger">
              Ne mogu da ucitam plan: {planState.message}
            </Text>
            <Pressable
              onPress={refetchPlan}
              className="self-start rounded-md border border-neutral-500 px-3 py-1.5"
            >
              <Text className="text-neutral-50 dark:text-neutral-1000">Pokusaj ponovo</Text>
            </Pressable>
          </View>
        ) : null}

        <View className="gap-2">
          <Text className="text-xs uppercase tracking-wide text-accent">Split</Text>
          <View className="flex-row flex-wrap gap-2">
            {(Object.keys(splitLabels) as SplitType[]).map((splitType) => (
              <Pressable
                key={splitType}
                testID={`training-plan-split-${splitType}`}
                onPress={() => setSelectedSplitType(splitType)}
                className={`rounded-md border px-3 py-2 ${
                  selectedSplitType === splitType ? "border-accent bg-accent" : "border-neutral-500"
                }`}
              >
                <Text
                  className={
                    selectedSplitType === splitType
                      ? "font-semibold text-neutral-50"
                      : "text-neutral-50 dark:text-neutral-1000"
                  }
                >
                  {splitLabels[splitType]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-xs uppercase tracking-wide text-accent">Trening dana nedeljno</Text>
          <View className="flex-row items-center gap-4">
            <Pressable
              testID="training-plan-days-decrement"
              onPress={() => setDaysPerWeek((value) => Math.max(1, value - 1))}
              className="rounded-md border border-neutral-500 px-4 py-2"
            >
              <Text className="text-neutral-50 dark:text-neutral-1000">-</Text>
            </Pressable>
            <Text className="text-lg font-semibold text-neutral-50 dark:text-neutral-1000">
              {daysPerWeek}
            </Text>
            <Pressable
              testID="training-plan-days-increment"
              onPress={() => setDaysPerWeek((value) => Math.min(7, value + 1))}
              className="rounded-md border border-neutral-500 px-4 py-2"
            >
              <Text className="text-neutral-50 dark:text-neutral-1000">+</Text>
            </Pressable>
          </View>
        </View>

        {updateState.status === "error" ? (
          <Text testID="training-plan-save-error" className="text-danger">
            Ne mogu da sacuvam plan: {updateState.message}
          </Text>
        ) : null}

        <Pressable
          testID="training-plan-save"
          onPress={handleSave}
          disabled={updateState.status === "submitting"}
          className={`items-center rounded-md bg-accent px-4 py-3 ${
            updateState.status === "submitting" ? "opacity-50" : ""
          }`}
        >
          <Text className="font-semibold text-neutral-50">
            {updateState.status === "submitting" ? "Cuvanje..." : "Sacuvaj plan"}
          </Text>
        </Pressable>

        {schedule ? (
          <View testID="training-plan-schedule" className="gap-2">
            <Text className="text-xs uppercase tracking-wide text-accent">Nedeljni raspored</Text>
            {schedule.map((focus, index) => (
              <View
                key={dayLabels[index]}
                testID={`training-plan-day-${index}`}
                className={`flex-row items-center justify-between rounded-md border p-3 ${
                  focus === "rest" ? "border-neutral-400" : "border-accent"
                }`}
              >
                <Text className="font-semibold text-neutral-50 dark:text-neutral-1000">
                  {dayLabels[index]}
                </Text>
                <Text className={focus === "rest" ? "text-neutral-600" : "text-accent"}>
                  {focusLabels[focus]}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
