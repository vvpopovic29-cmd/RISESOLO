import { Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { AchievementsScreen } from "../../src/achievement/AchievementsScreen";

export default function AchievementsRoute() {
  return (
    <View className="flex-1 bg-neutral-1000 dark:bg-neutral-50">
      <View className="px-6 pt-12">
        <Link href="/" asChild>
          <Pressable testID="achievements-back">
            <Text className="text-accent">&lt; Nazad</Text>
          </Pressable>
        </Link>
      </View>
      <AchievementsScreen />
    </View>
  );
}
