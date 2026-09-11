import { Pressable, Text, View } from "react-native";
import { classLabels } from "./class-labels";
import { usePlayer } from "./use-player";

export function PlayerStatusCard() {
  const { state, refetch } = usePlayer();

  if (state.status === "loading") {
    return (
      <View
        testID="player-status"
        className="w-full max-w-sm items-center gap-1 rounded-lg border border-neutral-400 p-4"
      >
        <Text className="text-neutral-600">Ucitavanje Player statusa...</Text>
      </View>
    );
  }

  if (state.status === "error") {
    return (
      <View
        testID="player-status"
        className="w-full max-w-sm items-center gap-2 rounded-lg border border-danger p-4"
      >
        <Text className="text-danger">Ne mogu da ucitam Player status: {state.message}</Text>
        <Pressable onPress={refetch} className="rounded-md border border-neutral-500 px-3 py-1.5">
          <Text className="text-neutral-50 dark:text-neutral-1000">Pokusaj ponovo</Text>
        </Pressable>
      </View>
    );
  }

  const player = state.data;
  const xpForLevel = player.xp + player.xpToNextLevel;
  const xpProgress = xpForLevel > 0 ? player.xp / xpForLevel : 0;

  return (
    <View
      testID="player-status"
      className="w-full max-w-sm gap-3 rounded-lg border border-accent p-4"
    >
      <View className="flex-row items-baseline justify-between">
        <Text className="text-xl font-bold text-neutral-50 dark:text-neutral-1000">
          {player.displayName}
        </Text>
        <Text className="font-semibold text-premium">Rank {player.rank}</Text>
      </View>

      {player.class ? (
        <Text className="text-xs text-neutral-600">{classLabels[player.class]}</Text>
      ) : null}

      <View className="flex-row items-baseline justify-between">
        <Text className="text-neutral-600">Level {player.level}</Text>
        <Text className="text-xs text-neutral-600">
          {player.xp} / {xpForLevel} XP
        </Text>
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-neutral-300">
        <View
          testID="player-status-xp-bar"
          className="h-full bg-accent"
          style={{ width: `${Math.round(xpProgress * 100)}%` }}
        />
      </View>

      <View className="flex-row flex-wrap gap-x-4 gap-y-1">
        <Text className="text-neutral-600">STR {player.strength}</Text>
        <Text className="text-neutral-600">AGI {player.agility}</Text>
        <Text className="text-neutral-600">END {player.endurance}</Text>
        <Text className="text-neutral-600">VIT {player.vitality}</Text>
        <Text className="text-neutral-600">INT {player.intelligence}</Text>
      </View>

      {player.statPointsAvailable > 0 ? (
        <Text className="text-reward">+{player.statPointsAvailable} Stat Points dostupno</Text>
      ) : null}

      <View className="flex-row items-center justify-between">
        <Text className="text-reward">Streak: {player.currentStreak} dana</Text>
        <Text className="text-neutral-600">{player.coins} coins</Text>
      </View>
    </View>
  );
}
