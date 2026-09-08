import { Pressable, Text, View } from "react-native";
import { useHealthCheck } from "./use-health-check";

export function HealthStatus() {
  const { state, refetch } = useHealthCheck();

  if (state.status === "loading") {
    return (
      <View testID="health-status" className="items-center gap-1">
        <Text className="text-neutral-600 dark:text-neutral-600">Proveravam API konekciju...</Text>
      </View>
    );
  }

  if (state.status === "error") {
    return (
      <View testID="health-status" className="items-center gap-2">
        <Text className="text-danger">API nije dostupan: {state.message}</Text>
        <Pressable onPress={refetch} className="px-3 py-1.5 rounded-md border border-neutral-500">
          <Text className="text-neutral-50 dark:text-neutral-1000">Pokusaj ponovo</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View testID="health-status" className="items-center gap-1">
      <Text className="text-success">API je dostupan</Text>
      <Text className="text-xs text-neutral-600">
        uptime: {Math.round(state.data.uptimeSeconds)}s
      </Text>
    </View>
  );
}
