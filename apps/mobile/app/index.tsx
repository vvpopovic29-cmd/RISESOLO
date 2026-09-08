import { Pressable, Text, View } from "react-native";
import { useColorScheme } from "nativewind";
import { HealthStatus } from "../src/health/HealthStatus";

export default function HomeScreen() {
  const { colorScheme, toggleColorScheme } = useColorScheme();

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
    </View>
  );
}
