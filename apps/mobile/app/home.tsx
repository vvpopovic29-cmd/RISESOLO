import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { Redirect, router, useFocusEffect } from "expo-router";
import { ApiError } from "@risesolo/api-client";
import type { AllocateStatPointsRequest } from "@risesolo/validation";
import { useAuth } from "../src/auth/AuthContext";
import { usePlayerState } from "../src/player/use-player-state";
import { useTodayQuest } from "../src/player/use-today-quest";
import { useBossQuest } from "../src/player/use-boss-quest";
import { useWeeklyQuest } from "../src/player/use-weekly-quest";
import { useMainQuest } from "../src/player/use-main-quest";
import { useSideQuest } from "../src/player/use-side-quest";
import { usePenaltyQuest } from "../src/player/use-penalty-quest";
import { useActiveSession } from "../src/workout/use-active-session";
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

/**
 * Dnevni quest sada ima varijetet kind-ova (vidi @risesolo/domain
 * daily-quest-pool) - CTA na kartici vodi ka odgovarajucoj akciji umesto da
 * uvek podrazumeva trening.
 */
const QUEST_KIND_CTA: Record<string, { label: string; route: "/exercises" | "/nutrition" }> = {
  WORKOUT_COMPLETE: { label: "Idi na trening", route: "/exercises" },
  LOG_NUTRITION: { label: "Idi na ishranu", route: "/nutrition" },
};

/**
 * Nedeljni quest je ODVOJEN od Boss Quest-a (koji je uvek "N treninga ove
 * nedelje") - progres se tumaci po kind-u (osvojen XP ili razliciti dani sa
 * unosom ishrane, vidi @risesolo/domain weekly-quest-pool).
 */
const WEEKLY_QUEST_KIND_UNIT: Record<string, string> = {
  XP_TARGET: "XP ove nedelje",
  NUTRITION_LOG_DAYS: "dana sa ishranom ove nedelje",
};

/**
 * Main Quest je dugorocni LANAC (za razliku od Daily/Weekly/Boss NIKAD ne
 * istice, traje dok se ne zavrsi) - rotira kroz stat-ove, odvojeno od
 * Achievements koji vec pokrivaju "dostigni level X" (vidi @risesolo/domain
 * main-quest-pool).
 */
const MAIN_QUEST_KIND_LABEL: Record<string, string> = {
  strength: "Snaga",
  agility: "Agilnost",
  endurance: "Izdrzljivost",
  vitality: "Vitalnost",
  intelligence: "Inteligencija",
};

/**
 * Side Quest je bonus izazov vezan za KONKRETNU sesiju treninga (MVP: samo
 * "nova vezba") - za razliku od Main/Weekly/Boss Quest-a, karticа se sakriva
 * kad je `data === null` (korisnik je iscrpeo biblioteku vezbi, vidi
 * QuestsService.generateSideQuest), umesto da prikaze prazno/error stanje.
 */
const SIDE_QUEST_KIND_LABEL: Record<string, string> = {
  NEW_EXERCISE: "nova vezba zavrsena",
};

/**
 * Penalty Quest = "iskupljenje" za Penalty System (vidi @risesolo/domain
 * penalty.ts) - postoji SAMO kada je dnevni quest danas propusten i kaznjen
 * (za razliku od svih drugih questova, NIKAD se ne generise proizvoljno).
 * Karticа se sakriva kad je `data === null` (normalno/najcesce stanje).
 */
const PENALTY_QUEST_KIND_LABEL: Record<string, string> = {
  REDEMPTION_WORKOUT: "treninga danas",
};

export default function HomeScreen() {
  const { apiClient, logout } = useAuth();
  const { state: playerState, refetch: refetchPlayer } = usePlayerState(apiClient);
  const { state: questState, refetch: refetchQuest } = useTodayQuest(apiClient);
  const { state: bossQuestState, refetch: refetchBossQuest } = useBossQuest(apiClient);
  const { state: weeklyQuestState, refetch: refetchWeeklyQuest } = useWeeklyQuest(apiClient);
  const { state: mainQuestState, refetch: refetchMainQuest } = useMainQuest(apiClient);
  const { state: sideQuestState, refetch: refetchSideQuest } = useSideQuest(apiClient);
  const { state: penaltyQuestState, refetch: refetchPenaltyQuest } = usePenaltyQuest(apiClient);
  const { state: activeSessionState, refetch: refetchActiveSession } = useActiveSession(apiClient);
  const [allocating, setAllocating] = useState(false);
  const [allocateError, setAllocateError] = useState<string | null>(null);
  const [abandoning, setAbandoning] = useState(false);

  // Home ostaje mounted u navigation stack-u (router.dismissTo ga ponovo
  // fokusira umesto da montira novu instancu), pa refetch na focus
  // garantuje sveze XP/level/coins/streak posle zavrsenog treninga.
  useFocusEffect(
    useCallback(() => {
      refetchPlayer();
      refetchQuest();
      refetchBossQuest();
      refetchWeeklyQuest();
      refetchMainQuest();
      refetchSideQuest();
      refetchPenaltyQuest();
      refetchActiveSession();
    }, [
      refetchPlayer,
      refetchQuest,
      refetchBossQuest,
      refetchWeeklyQuest,
      refetchMainQuest,
      refetchSideQuest,
      refetchPenaltyQuest,
      refetchActiveSession,
    ]),
  );

  async function handleAbandonActive(sessionId: string) {
    setAbandoning(true);
    try {
      await apiClient.workouts.abandonSession(sessionId);
      refetchActiveSession();
    } catch {
      // Tiho ignorisemo - refetch ce svakako pokazati stvarno stanje sesije.
    } finally {
      setAbandoning(false);
    }
  }

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
          <View className="flex-row items-center gap-2">
            {profile.avatarFrameColorHex ? (
              <View
                testID="avatar-frame-dot"
                style={{ backgroundColor: profile.avatarFrameColorHex }}
                className="h-3 w-3 rounded-full"
              />
            ) : null}
            <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">{profile.username}</Text>
          </View>
          {profile.title ? (
            <Text testID="equipped-title" className="text-xs font-semibold text-accent">
              {profile.title}
            </Text>
          ) : null}
          <View className="flex-row items-center gap-2">
            <View className="rounded-full bg-premium/20 px-2.5 py-0.5">
              <Text className="text-xs font-bold text-premium">RANK {progression.rank}</Text>
            </View>
            <Text className="text-sm text-neutral-500 dark:text-neutral-600">Level {progression.level}</Text>
          </View>
        </View>
        <Button label="Odjava" variant="secondary" onPress={() => void handleLogout()} testID="logout-button" />
      </View>

      {activeSessionState.status === "success" && activeSessionState.data.session ? (
        <ActiveSessionBanner
          sessionId={activeSessionState.data.session.id}
          firstSet={activeSessionState.data.sets[0] ?? null}
          onAbandon={handleAbandonActive}
          abandoning={abandoning}
        />
      ) : null}

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
            {questState.data.status === "AVAILABLE"
              ? (() => {
                  const cta = QUEST_KIND_CTA[questState.data.kind];
                  return cta ? (
                    <Button label={cta.label} variant="secondary" onPress={() => router.push(cta.route)} testID="daily-quest-cta" />
                  ) : null;
                })()
              : null}
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

      <View className="gap-2 rounded-lg border border-accent/40 p-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-accent">NEDELJNI QUEST</Text>
          {weeklyQuestState.status === "success" && weeklyQuestState.data.status === "COMPLETED" ? (
            <Text className="text-xs font-bold text-accent">ZAVRSEN</Text>
          ) : null}
        </View>
        {weeklyQuestState.status === "loading" ? (
          <Text className="text-neutral-500 dark:text-neutral-600">Ucitavam...</Text>
        ) : weeklyQuestState.status === "error" ? (
          <ErrorState message={weeklyQuestState.message} onRetry={refetchWeeklyQuest} />
        ) : (
          <>
            <Text className="text-base font-semibold text-neutral-50 dark:text-neutral-1000">
              {weeklyQuestState.data.title}
            </Text>
            {weeklyQuestState.data.description ? (
              <Text className="text-sm text-neutral-500 dark:text-neutral-600">{weeklyQuestState.data.description}</Text>
            ) : null}
            <ProgressBar
              progress={weeklyQuestState.data.progress / weeklyQuestState.data.targetProgress}
              colorClassName="bg-accent"
              testID="weekly-quest-progress"
            />
            <View className="flex-row items-center justify-between pt-1">
              <Text className="text-xs text-neutral-500 dark:text-neutral-600">
                {weeklyQuestState.data.progress} / {weeklyQuestState.data.targetProgress}{" "}
                {WEEKLY_QUEST_KIND_UNIT[weeklyQuestState.data.kind] ?? ""}
              </Text>
              <Text className="text-xs text-reward">
                +{weeklyQuestState.data.xpReward} XP · +{weeklyQuestState.data.coinReward} coins
              </Text>
            </View>
          </>
        )}
      </View>

      <View className="gap-2 rounded-lg border border-reward/40 p-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-reward">
            GLAVNI QUEST{mainQuestState.status === "success" ? ` · TIER ${mainQuestState.data.tier}` : ""}
          </Text>
          {mainQuestState.status === "success" && mainQuestState.data.status === "COMPLETED" ? (
            <Text className="text-xs font-bold text-reward">ZAVRSEN</Text>
          ) : null}
        </View>
        {mainQuestState.status === "loading" ? (
          <Text className="text-neutral-500 dark:text-neutral-600">Ucitavam...</Text>
        ) : mainQuestState.status === "error" ? (
          <ErrorState message={mainQuestState.message} onRetry={refetchMainQuest} />
        ) : (
          <>
            <Text className="text-base font-semibold text-neutral-50 dark:text-neutral-1000">
              {mainQuestState.data.title}
            </Text>
            {mainQuestState.data.description ? (
              <Text className="text-sm text-neutral-500 dark:text-neutral-600">{mainQuestState.data.description}</Text>
            ) : null}
            <ProgressBar
              progress={mainQuestState.data.progress / mainQuestState.data.targetProgress}
              colorClassName="bg-reward"
              testID="main-quest-progress"
            />
            <View className="flex-row items-center justify-between pt-1">
              <Text className="text-xs text-neutral-500 dark:text-neutral-600">
                {mainQuestState.data.progress} / {mainQuestState.data.targetProgress}{" "}
                {MAIN_QUEST_KIND_LABEL[mainQuestState.data.kind] ?? ""}
              </Text>
              <Text className="text-xs text-reward">
                +{mainQuestState.data.xpReward} XP · +{mainQuestState.data.coinReward} coins
              </Text>
            </View>
          </>
        )}
      </View>

      {sideQuestState.status === "success" && sideQuestState.data === null ? null : (
        <View className="gap-2 rounded-lg border border-accent/40 p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-accent">SPOREDNI QUEST</Text>
            {sideQuestState.status === "success" && sideQuestState.data && sideQuestState.data.status === "COMPLETED" ? (
              <Text className="text-xs font-bold text-accent">ZAVRSEN</Text>
            ) : null}
          </View>
          {sideQuestState.status === "loading" ? (
            <Text className="text-neutral-500 dark:text-neutral-600">Ucitavam...</Text>
          ) : sideQuestState.status === "error" ? (
            <ErrorState message={sideQuestState.message} onRetry={refetchSideQuest} />
          ) : sideQuestState.data ? (
            <>
              <Text className="text-base font-semibold text-neutral-50 dark:text-neutral-1000">
                {sideQuestState.data.title}
              </Text>
              {sideQuestState.data.description ? (
                <Text className="text-sm text-neutral-500 dark:text-neutral-600">{sideQuestState.data.description}</Text>
              ) : null}
              <ProgressBar
                progress={sideQuestState.data.progress / sideQuestState.data.targetProgress}
                colorClassName="bg-accent"
                testID="side-quest-progress"
              />
              <View className="flex-row items-center justify-between pt-1">
                <Text className="text-xs text-neutral-500 dark:text-neutral-600">
                  {sideQuestState.data.progress} / {sideQuestState.data.targetProgress}{" "}
                  {SIDE_QUEST_KIND_LABEL[sideQuestState.data.kind] ?? ""}
                </Text>
                <Text className="text-xs text-reward">
                  +{sideQuestState.data.xpReward} XP · +{sideQuestState.data.coinReward} coins
                </Text>
              </View>
              {sideQuestState.data.status !== "COMPLETED" ? (
                <Button
                  label="Isprobaj novu vezbu"
                  variant="secondary"
                  onPress={() => router.push("/exercises")}
                  testID="side-quest-cta-button"
                />
              ) : null}
            </>
          ) : null}
        </View>
      )}

      {penaltyQuestState.status === "success" && penaltyQuestState.data === null ? null : (
        <View className="gap-2 rounded-lg border border-danger/40 p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-danger">QUEST ISKUPLJENJA</Text>
            {penaltyQuestState.status === "success" && penaltyQuestState.data && penaltyQuestState.data.status === "COMPLETED" ? (
              <Text className="text-xs font-bold text-danger">ZAVRSEN</Text>
            ) : null}
          </View>
          {penaltyQuestState.status === "loading" ? (
            <Text className="text-neutral-500 dark:text-neutral-600">Ucitavam...</Text>
          ) : penaltyQuestState.status === "error" ? (
            <ErrorState message={penaltyQuestState.message} onRetry={refetchPenaltyQuest} />
          ) : penaltyQuestState.data ? (
            <>
              <Text className="text-base font-semibold text-neutral-50 dark:text-neutral-1000">
                {penaltyQuestState.data.title}
              </Text>
              {penaltyQuestState.data.description ? (
                <Text className="text-sm text-neutral-500 dark:text-neutral-600">{penaltyQuestState.data.description}</Text>
              ) : null}
              <ProgressBar
                progress={penaltyQuestState.data.progress / penaltyQuestState.data.targetProgress}
                colorClassName="bg-danger"
                testID="penalty-quest-progress"
              />
              <View className="flex-row items-center justify-between pt-1">
                <Text className="text-xs text-neutral-500 dark:text-neutral-600">
                  {penaltyQuestState.data.progress} / {penaltyQuestState.data.targetProgress}{" "}
                  {PENALTY_QUEST_KIND_LABEL[penaltyQuestState.data.kind] ?? ""}
                </Text>
                <Text className="text-xs text-reward">
                  +{penaltyQuestState.data.xpReward} XP · +{penaltyQuestState.data.coinReward} coins
                </Text>
              </View>
              {penaltyQuestState.data.status !== "COMPLETED" ? (
                <Button
                  label="Idi na trening"
                  variant="secondary"
                  onPress={() => router.push("/exercises")}
                  testID="penalty-quest-cta-button"
                />
              ) : null}
            </>
          ) : null}
        </View>
      )}

      <View className="gap-3">
        <Button label="Izaberi vezbu i zapocni trening" onPress={() => router.push("/exercises")} testID="start-workout-button" />
        <Button
          label="Moji treninzi"
          variant="secondary"
          onPress={() => router.push("/workout-templates")}
          testID="workout-templates-button"
        />
        <Button
          label="Istorija treninga"
          variant="secondary"
          onPress={() => router.push("/workout-history")}
          testID="workout-history-button"
        />
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
        <Button
          label="Prijatelji"
          variant="secondary"
          onPress={() => router.push("/friends")}
          testID="friends-button"
        />
        <Button
          label="Achievements"
          variant="secondary"
          onPress={() => router.push("/achievements")}
          testID="achievements-button"
        />
        <Button
          label="Leaderboard"
          variant="secondary"
          onPress={() => router.push("/leaderboard")}
          testID="leaderboard-button"
        />
        <Button
          label="Prodavnica"
          variant="secondary"
          onPress={() => router.push("/shop")}
          testID="shop-button"
        />
        <Button
          label="RISESOLO Pro"
          variant="secondary"
          onPress={() => router.push("/paywall")}
          testID="paywall-button"
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

function ActiveSessionBanner({
  sessionId,
  firstSet,
  onAbandon,
  abandoning,
}: {
  sessionId: string;
  firstSet: { exerciseSlug: string; exerciseName: string } | null;
  onAbandon: (sessionId: string) => void;
  abandoning: boolean;
}) {
  return (
    <View className="gap-2 rounded-lg border border-accent/40 bg-accent/10 p-3" testID="active-session-banner">
      <Text className="text-sm font-semibold text-accent">TRENING U TOKU</Text>
      <Text className="text-xs text-neutral-400 dark:text-neutral-700">
        {firstSet ? `Pauzirano na vezbi: ${firstSet.exerciseName}` : "Pauziran trening bez ulogovanih serija."}
      </Text>
      <View className="flex-row gap-3">
        {firstSet ? (
          <Button
            label="Nastavi"
            onPress={() =>
              router.push({ pathname: "/workout", params: { exerciseSlug: firstSet.exerciseSlug, resume: "1" } })
            }
            testID="resume-session-button"
          />
        ) : null}
        <Button
          label="Odustani"
          variant="secondary"
          onPress={() => onAbandon(sessionId)}
          loading={abandoning}
          testID="abandon-session-button"
        />
      </View>
    </View>
  );
}
