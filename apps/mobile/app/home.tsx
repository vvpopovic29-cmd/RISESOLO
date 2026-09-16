import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { Redirect, router, useFocusEffect } from "expo-router";
import { ApiError } from "@risesolo/api-client";
import type { AllocateStatPointsRequest } from "@risesolo/validation";
import { useAuth } from "../src/auth/AuthContext";
import { usePlayerState } from "../src/player/use-player-state";
import { useTodayQuest } from "../src/player/use-today-quest";
import { useBossQuest } from "../src/player/use-boss-quest";
import { StatAllocator } from "../src/player/StatAllocator";
import { Button } from "../src/ui/Button";
import { ErrorState } from "../src/ui/ErrorState";
import { ProgressBar } from "../src/ui/ProgressBar";
import { Screen } from "../src/ui/Screen";

const QUEST_STATUS_LABEL: Record<string, string> = {
  AVAILABLE: "Dostupan",
  IN_PROGRESS: "U toku",
  COMPLETED: "Zavrsen",
  EXPIRED: "Istekao",
};

export default function HomeScreen() {
  const { apiClient, logout } = useAuth();
  const { state: playerState, refetch: refetchPlayer } = usePlayerState(apiClient);
  const { state: questState, refetch: refetchQuest } = useTodayQuest(apiClient);
  const { state: bossQuestState, refetch: refetchBossQuest } = useBossQuest(apiClient);
  const [allocating, setAllocating] = useState(false);
  const [allocateError, setAllocateError] = useState<string | null>(null);

  // Home ostaje mounted u navigation stack-u (router.dismissTo ga ponovo
  // fokusira umesto da montira novu instancu), pa refetch na focus
  // garantuje sveze XP/level/coins/streak posle zavrsenog treninga.
  useFocusEffect(
    useCallback(() => {
      refetchPlayer();
      refetchQuest();
      refetchBossQuest();
    }, [refetchPlayer, refetchQuest, refetchBossQuest]),
  );

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  const handleAllocate = useCallback(
    async (allocation: AllocateStatPointsRequest) => {
      setAllocating(true);
      setAllocateError(null);
      try {
        await apiClient.players.allocateStats(allocation);
        refetchPlayer();
      } catch (error) {
        setAllocateError(error instanceof ApiError ? error.message : "Raspodela poena nije uspela.");
      } finally {
        setAllocating(false);
      }
    },
    [apiClient, refetchPlayer],
  );

  if (playerState.status === "loading") {
    return (
      <Screen>
        <Text testID="home-loading" className="text-center text-neutral-500 dark:text-neutral-600">
          Ucitavam System...
        </Text>
      </Screen>
    );
  }

  if (playerState.status === "error") {
    return (
      <Screen>
        <ErrorState message={playerState.message} onRetry={refetchPlayer} testID="home-error" />
      </Screen>
    );
  }

  const { profile, progression, stats, penalty } = playerState.data;

  if (!profile.onboarded) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Screen>
      <View className="flex-row items-start justify-between">
        <View className="gap-1">
          <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">{profile.username}</Text>
          <View className="flex-row items-center gap-2">
            <View className="rounded-full bg-premium/20 px-2.5 py-0.5">
              <Text className="text-xs font-bold text-premium">RANK {progression.rank}</Text>
            </View>
            <Text className="text-sm text-neutral-500 dark:text-neutral-600">Level {progression.level}</Text>
          </View>
        </View>
        <Button label="Odjava" variant="secondary" onPress={() => void handleLogout()} testID="logout-button" />
      </View>

      {penalty.applied ? (
        <View className="gap-1 rounded-lg border border-danger/40 bg-danger/10 p-3" testID="penalty-banner">
          <Text className="text-sm font-semibold text-danger">PROPUSTEN DNEVNI QUEST</Text>
          <Text className="text-xs text-neutral-400 dark:text-neutral-700">
            Izgubio si {penalty.coinsLost} coins jer{" "}
            {penalty.missedQuestCount === 1
              ? "juce nisi zavrsio dnevni quest."
              : `${penalty.missedQuestCount} dana nisi zavrsio dnevni quest.`}
          </Text>
        </View>
      ) : null}

      <View className="gap-1.5">
        <ProgressBar progress={progression.progress} />
        <Text className="text-xs text-neutral-500 dark:text-neutral-600">
          {progression.currentLevelXp} / {progression.requiredXp} XP do sledeceg levela
        </Text>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1 items-center gap-1 rounded-lg bg-reward/10 py-3">
          <Text className="text-lg font-bold text-reward">{progression.coins}</Text>
          <Text className="text-xs text-neutral-500 dark:text-neutral-600">Coins</Text>
        </View>
        <View className="flex-1 items-center gap-1 rounded-lg bg-reward/10 py-3">
          <Text className="text-lg font-bold text-reward">{progression.currentStreak}</Text>
          <Text className="text-xs text-neutral-500 dark:text-neutral-600">Streak (dana)</Text>
        </View>
      </View>

      {stats.statPoints > 0 ? (
        <View className="gap-2">
          <StatAllocator stats={stats} onSubmit={(a) => void handleAllocate(a)} submitting={allocating} />
          {allocateError ? <Text className="text-center text-danger">{allocateError}</Text> : null}
        </View>
      ) : (
        <View className="flex-row flex-wrap gap-x-6 gap-y-2 rounded-lg border border-neutral-700 p-4 dark:border-neutral-400">
          <StatCell label="Snaga" value={stats.strength} />
          <StatCell label="Agilnost" value={stats.agility} />
          <StatCell label="Izdrzljivost" value={stats.endurance} />
          <StatCell label="Vitalnost" value={stats.vitality} />
          <StatCell label="Inteligencija" value={stats.intelligence} />
        </View>
      )}

      <View className="gap-2 rounded-lg border border-neutral-700 p-4 dark:border-neutral-400">
        <Text className="text-sm font-semibold text-neutral-400 dark:text-neutral-700">DANASNJI QUEST</Text>
        {questState.status === "loading" ? (
          <Text className="text-neutral-500 dark:text-neutral-600">Ucitavam...</Text>
        ) : questState.status === "error" ? (
          <ErrorState message={questState.message} onRetry={refetchQuest} />
        ) : (
          <>
            <Text className="text-base font-semibold text-neutral-50 dark:text-neutral-1000">
              {questState.data.title}
            </Text>
            {questState.data.description ? (
              <Text className="text-sm text-neutral-500 dark:text-neutral-600">{questState.data.description}</Text>
            ) : null}
            <View className="flex-row items-center justify-between pt-1">
              <Text className="text-xs text-reward">
                +{questState.data.xpReward} XP · +{questState.data.coinReward} coins
              </Text>
              <Text className="text-xs font-medium text-accent">
                {QUEST_STATUS_LABEL[questState.data.status] ?? questState.data.status}
              </Text>
            </View>
          </>
        )}
      </View>

      <View className="gap-2 rounded-lg border border-premium/40 p-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-premium">NEDELJNI BOSS QUEST</Text>
          {bossQuestState.status === "success" && bossQuestState.data.status === "COMPLETED" ? (
            <Text className="text-xs font-bold text-premium">POBEDJEN</Text>
          ) : null}
        </View>
        {bossQuestState.status === "loading" ? (
          <Text className="text-neutral-500 dark:text-neutral-600">Ucitavam...</Text>
        ) : bossQuestState.status === "error" ? (
          <ErrorState message={bossQuestState.message} onRetry={refetchBossQuest} />
        ) : (
          <>
            <Text className="text-base font-semibold text-neutral-50 dark:text-neutral-1000">
              {bossQuestState.data.title}
            </Text>
            <ProgressBar
              progress={bossQuestState.data.progress / bossQuestState.data.targetSessions}
              colorClassName="bg-premium"
              testID="boss-quest-progress"
            />
            <View className="flex-row items-center justify-between pt-1">
              <Text className="text-xs text-neutral-500 dark:text-neutral-600">
                {bossQuestState.data.progress} / {bossQuestState.data.targetSessions} treninga ove nedelje
              </Text>
              <Text className="text-xs text-reward">
                +{bossQuestState.data.xpReward} XP · +{bossQuestState.data.coinReward} coins
              </Text>
            </View>
          </>
        )}
      </View>

      <View className="gap-3">
        <Button label="Izaberi vezbu i zapocni trening" onPress={() => router.push("/exercises")} testID="start-workout-button" />
        <Button
          label="AI trening plan"
          variant="secondary"
          onPress={() => router.push("/training-plan")}
          testID="training-plan-button"
        />
        <Button
          label="Ishrana"
          variant="secondary"
          onPress={() => router.push("/nutrition")}
          testID="nutrition-button"
        />
        <Button
          label="Ceh"
          variant="secondary"
          onPress={() => router.push("/guild")}
          testID="guild-button"
        />
      </View>
    </Screen>
  );
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <View className="w-[40%] gap-0.5">
      <Text className="text-xs text-neutral-500 dark:text-neutral-600">{label}</Text>
      <Text className="text-lg font-semibold text-neutral-50 dark:text-neutral-1000">{value}</Text>
    </View>
  );
}
