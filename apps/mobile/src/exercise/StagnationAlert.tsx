import { Link } from "expo-router";
import { Pressable, Text } from "react-native";
import { useStagnationSummary } from "./use-stagnation-summary";

/**
 * Faza 15: prikazuje se na System Status (home) ekranu kada bar jedna
 * vezba stagnira (poslednje 3 sesije, videti `training.detectStagnation`) -
 * ranije je korisnik morao sam da otvori svaku vezbu na Progressive
 * Overload ekranu da bi video ovaj signal.
 */
export function StagnationAlert() {
  const { state } = useStagnationSummary();

  if (state.status !== "success" || state.data.length === 0) {
    return null;
  }

  const message =
    state.data.length === 1
      ? `${state.data[0]?.exerciseName} stagnira - probaj da promenis broj ponavljanja ili povecas tezinu.`
      : `${state.data.length} vezbi stagnira - vreme je za promenu programa.`;

  return (
    <Link href="/exercise/progress" asChild>
      <Pressable
        testID="stagnation-alert"
        className="w-full max-w-sm gap-1 rounded-lg border border-warning p-4"
      >
        <Text className="text-xs uppercase tracking-wide text-warning">System AI upozorenje</Text>
        <Text className="text-neutral-50 dark:text-neutral-1000">{message}</Text>
      </Pressable>
    </Link>
  );
}
