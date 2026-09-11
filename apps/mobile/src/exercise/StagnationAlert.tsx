import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useStagnationSummary } from "./use-stagnation-summary";

/**
 * Faza 15/16: prikazuje se na System Status (home) ekranu kada bar jedna
 * vezba stagnira ili regresira (poslednje 3 sesije, videti
 * `training.detectStagnation`) - ranije je korisnik morao sam da otvori
 * svaku vezbu na Progressive Overload ekranu da bi video ovaj signal.
 * Deload preporuka (Faza 16) je odvojena i istaknutija poruka - vise
 * vezbi koje istovremeno opadaju je jaci signal umora nego jedna koja
 * stagnira, pa se prikazuje prva kada oba stanja postoje.
 */
export function StagnationAlert() {
  const { state } = useStagnationSummary();

  if (state.status !== "success") {
    return null;
  }

  const { stagnantExercises, deloadRecommended } = state.data;
  if (!deloadRecommended && stagnantExercises.length === 0) {
    return null;
  }

  const stagnationMessage =
    stagnantExercises.length === 1
      ? `${stagnantExercises[0]?.exerciseName} stagnira - probaj da promenis broj ponavljanja ili povecas tezinu.`
      : `${stagnantExercises.length} vezbi stagnira - vreme je za promenu programa.`;

  return (
    <Link href="/exercise/progress" asChild>
      <Pressable
        testID="stagnation-alert"
        className="w-full max-w-sm gap-1 rounded-lg border border-warning p-4"
      >
        {deloadRecommended ? (
          <View testID="deload-recommendation" className="gap-1">
            <Text className="text-xs uppercase tracking-wide text-warning">
              Deload nedelja preporucena
            </Text>
            <Text className="text-neutral-50 dark:text-neutral-1000">
              Vise vezbi opada tri treninga zaredom - razmisli o nedelji smanjenog intenziteta/obima
              pre nego sto nastavis dalje.
            </Text>
          </View>
        ) : null}
        {stagnantExercises.length > 0 ? (
          <View className="gap-1">
            <Text className="text-xs uppercase tracking-wide text-warning">
              System AI upozorenje
            </Text>
            <Text className="text-neutral-50 dark:text-neutral-1000">{stagnationMessage}</Text>
          </View>
        ) : null}
      </Pressable>
    </Link>
  );
}
