import { Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { TrainingPlanScreen } from "../../src/training-plan/TrainingPlanScreen";

export default function TrainingPlanRoute() {
  return (
    <View className="flex-1 bg-neutral-1000 dark:bg-neutral-50">
      <View className="px-6 pt-12">
        <Link href="/" asChild>
          <Pressable testID="training-plan-back">
            <Text className="text-accent">&lt; Nazad</Text>
          </Pressable>
        </Link>
      </View>
      <TrainingPlanScreen />
    </View>
  );
}
