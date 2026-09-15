import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useColorScheme } from "nativewind";
import { HealthStatus } from "../src/health/HealthStatus";
import { LevelUpScreen } from "../src/progression/LevelUpScreen";

export default function HomeScreen() {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const [levelUpPreviewVisible, setLevelUpPreviewVisible] = useState(false);

  return (
    <View className="flex-1 items-center justify-center gap-6 bg-neutral-1000 px-6 dark:bg-neutral-50">
      <View className="items-center gap-1">
        <Text className="text-4xl font-bold text-neutral-50 dark:text-neutral-1000">RISESOLO</Text>
        <Text className="text-base text-neutral-500 dark:text-neutral-700">
          Faza 1 - razvojno okruzenje
        </Text>
      </View>

      <HealthStatus />

      <Pressable
        onPress={toggleColorScheme}
        className="rounded-md border border-neutral-500 px-4 py-2"
      >
        <Text className="text-neutral-50 dark:text-neutral-1000">
          Tema: {colorScheme === "dark" ? "Dark" : "Light"} (dodirni za promenu)
        </Text>
      </Pressable>

      {/*
        Privremeni demo okidac (Faza 7) - dok Faza 10/11 ne povezu stvarni
        workout-completion tok, ovo je jedino mesto gde se LevelUpScreen moze
        vizuelno proveriti. Uklanja se kad postoji pravi ekran koji ga
        pokrece iz stvarnog CompletionOutcome-a.
      */}
      <Pressable
        onPress={() => setLevelUpPreviewVisible(true)}
        className="rounded-md border border-accent px-4 py-2"
      >
        <Text className="text-accent">Pregled: Level Up ekran</Text>
      </Pressable>

      <LevelUpScreen
        visible={levelUpPreviewVisible}
        previousLevel={5}
        newLevel={6}
        statPointsAwarded={3}
        onContinue={() => setLevelUpPreviewVisible(false)}
      />
    </View>
  );
}
