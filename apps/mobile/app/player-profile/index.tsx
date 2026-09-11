import { Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { PlayerProfileScreen } from "../../src/player/PlayerProfileScreen";

export default function PlayerProfileRoute() {
  return (
    <View className="flex-1 bg-neutral-1000 dark:bg-neutral-50">
      <View className="px-6 pt-12">
        <Link href="/" asChild>
          <Pressable testID="player-profile-back">
            <Text className="text-accent">&lt; Nazad</Text>
          </Pressable>
        </Link>
      </View>
      <PlayerProfileScreen />
    </View>
  );
}
