import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Redirect, router, useFocusEffect } from "expo-router";
import { ApiError } from "@risesolo/api-client";
import type { AllocateStatPointsRequest } from "@risesolo/validation";
import { useAuth } from "../src/auth/AuthContext";
import { useI18n } from "../src/i18n";
import { usePlayerState } from "../src/player/use-player-state";
import { useTodayQuest } from "../src/player/use-today-quest";
import { useBossQuest } from "../src/player/use-boss-quest";
import { useWeeklyQuest } from "../src/player/use-weekly-quest";
import { useMainQuest } from "../src/player/use-main-quest";
import { useSideQuest } from "../src/player/use-side-quest";
import { usePenaltyQuest } from "../src/player/use-penalty-quest";
import { useAiQuest } from "../src/player/use-ai-quest";
import { useActiveSession } from "../src/workout/use-active-session";
import { StatAllocator } from "../src/player/StatAllocator";
import { Button } from "../src/ui/Button";
import { ErrorState } from "../src/ui/ErrorState";
import { ProgressBar } from "../src/ui/ProgressBar";
import { Screen } from "../src/ui/Screen";

export default function HomeScreen() {
  const { apiClient, logout } = useAuth();
  const { t, setLocale } = useI18n();
  const { state: playerState, refetch: refetchPlayer } = usePlayerState(apiClient);

  // Profile.locale (server-authoritative, postavljen pri onboardingu ili u
  // Settings ekranu) preuzima nad jezikom pogodjenim iz uredjaja cim se
  // ucita - pokriva slucaj prijave na nalog ciji je jezik vec drugaciji
  // podesen na drugom uredjaju. NAMERNO se preskace dok profil jos nije
  // onboard-ovan (Home se kratko renderuje pre <Redirect href="/onboarding">
  // ispod) - `locale` je tada jos DB podrazumevana vrednost, ne stvarni
  // izbor korisnika, i ne sme da prepise jezik uredjaja pre nego sto
  // onboarding stigne da ga posalje nazad na server.
  useEffect(() => {
    if (playerState.status === "success" && playerState.data.profile.onboarded) {
      setLocale(playerState.data.profile.locale);
    }
  }, [playerState, setLocale]);

  const QUEST_STATUS_LABEL: Record<string, string> = {
    AVAILABLE: t("home.questStatusAvailable"),
    IN_PROGRESS: t("home.questStatusInProgress"),
    COMPLETED: t("home.questStatusCompleted"),
    EXPIRED: t("home.questStatusExpired"),
  };

  // Dnevni quest sada ima varijetet kind-ova (vidi @risesolo/domain
  // daily-quest-pool) - CTA na kartici vodi ka odgovarajucoj akciji umesto da
  // uvek podrazumeva trening.
  const QUEST_KIND_CTA: Record<string, { label: string; route: "/exercises" | "/nutrition" }> = {
    WORKOUT_COMPLETE: { label: t("home.goToWorkout"), route: "/exercises" },
    LOG_NUTRITION: { label: t("home.goToNutrition"), route: "/nutrition" },
  };

  // Nedeljni quest je ODVOJEN od Boss Quest-a (koji je uvek "N treninga ove
  // nedelje") - progres se tumaci po kind-u (osvojen XP ili razliciti dani sa
  // unosom ishrane, vidi @risesolo/domain weekly-quest-pool).
  const WEEKLY_QUEST_KIND_UNIT: Record<string, string> = {
    XP_TARGET: t("home.weeklyUnitXp"),
    NUTRITION_LOG_DAYS: t("home.weeklyUnitNutritionDays"),
  };

  // Main Quest je dugorocni LANAC (za razliku od Daily/Weekly/Boss NIKAD ne
  // istice, traje dok se ne zavrsi) - rotira kroz stat-ove, odvojeno od
  // Achievements koji vec pokrivaju "dostigni level X" (vidi @risesolo/domain
  // main-quest-pool).
  const MAIN_QUEST_KIND_LABEL: Record<string, string> = {
    strength: t("home.statStrength"),
    agility: t("home.statAgility"),
    endurance: t("home.statEndurance"),
    vitality: t("home.statVitality"),
    intelligence: t("home.statIntelligence"),
  };

  // Side Quest je bonus izazov vezan za KONKRETNU sesiju treninga (MVP: samo
  // "nova vezba") - za razliku od Main/Weekly/Boss Quest-a, karticа se sakriva
  // kad je `data === null` (korisnik je iscrpeo biblioteku vezbi, vidi
  // QuestsService.generateSideQuest), umesto da prikaze prazno/error stanje.
  const SIDE_QUEST_KIND_LABEL: Record<string, string> = {
    NEW_EXERCISE: t("home.sideUnitNewExercise"),
  };

  // Penalty Quest = "iskupljenje" za Penalty System (vidi @risesolo/domain
  // penalty.ts) - postoji SAMO kada je dnevni quest danas propusten i kaznjen
  // (za razliku od svih drugih questova, NIKAD se ne generise proizvoljno).
  // Karticа se sakriva kad je `data === null` (normalno/najcesce stanje).
  const PENALTY_QUEST_KIND_LABEL: Record<string, string> = {
    REDEMPTION_WORKOUT: t("home.penaltyUnitWorkout"),
  };

  // AI Quest - Pro-gated bonus quest ciji title/description generise Claude,
  // personalizovano po nivou/rangu/stat-ovima/streak-u (vidi apps/api/src/ai
  // generateQuestFlavor). Zavrsava se identicno Daily Quest-ovom
  // WORKOUT_COMPLETE kind-u (bilo koji zavrsen trening danas). Karticа se
  // sakriva kad je `data === null` (besplatan korisnik ili AI nedostupan).
  const AI_QUEST_KIND_LABEL: Record<string, string> = {
    AI_PERSONALIZED: t("home.aiUnitPersonalized"),
  };
  // Questovi se NAMERNO ne ucitavaju dok profil nije onboard-ovan - Home
  // se kratko montira (i ostaje montiran u navigation stack-u) PRE
  // <Redirect href="/onboarding"> ispod, pa bi ovi pozivi inace GENERISALI
  // (i trajno perzistirali - vidi QuestsService "generate once, persist")
  // dnevni/boss/nedeljni/itd. quest sa jezikom uredjaja iz baze PRE nego sto
  // onboarding stigne da posalje pravi izbor korisnika (isti razlog kao
  // locale-sync efekat gore).
  const onboarded = playerState.status === "success" && playerState.data.profile.onboarded;
  const { state: questState, refetch: refetchQuest } = useTodayQuest(apiClient, onboarded);
  const { state: bossQuestState, refetch: refetchBossQuest } = useBossQuest(apiClient, onboarded);
  const { state: weeklyQuestState, refetch: refetchWeeklyQuest } = useWeeklyQuest(apiClient, onboarded);
  const { state: mainQuestState, refetch: refetchMainQuest } = useMainQuest(apiClient, onboarded);
  const { state: sideQuestState, refetch: refetchSideQuest } = useSideQuest(apiClient, onboarded);
  const { state: penaltyQuestState, refetch: refetchPenaltyQuest } = usePenaltyQuest(apiClient, onboarded);
  const { state: aiQuestState, refetch: refetchAiQuest } = useAiQuest(apiClient, onboarded);
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
      refetchAiQuest();
      refetchActiveSession();
    }, [
      refetchPlayer,
      refetchQuest,
      refetchBossQuest,
      refetchWeeklyQuest,
      refetchMainQuest,
      refetchSideQuest,
      refetchPenaltyQuest,
      refetchAiQuest,
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
        setAllocateError(error instanceof ApiError ? error.message : t("home.allocateFailed"));
      } finally {
        setAllocating(false);
      }
    },
    [apiClient, refetchPlayer, t],
  );

  if (playerState.status === "loading") {
    return (
      <Screen>
        <Text testID="home-loading" className="text-center text-neutral-500 dark:text-neutral-600">
          {t("home.loadingSystem")}
        </Text>
      </Screen>
    );
  }

  if (playerState.status === "error") {
    return (
      <Screen>
        <ErrorState message={playerState.message} onRetry={refetchPlayer} retryLabel={t("common.retry")} testID="home-error" />
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
            <Text className="text-sm text-neutral-500 dark:text-neutral-600">
              {t("home.level")} {progression.level}
            </Text>
          </View>
        </View>
        <View className="items-end gap-2">
          <Button label={t("home.logout")} variant="secondary" onPress={() => void handleLogout()} testID="logout-button" />
          <Button
            label={t("home.settings")}
            variant="secondary"
            onPress={() => router.push("/settings")}
            testID="settings-button"
          />
        </View>
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
          <Text className="text-sm font-semibold text-danger">{t("home.penaltyBannerTitle")}</Text>
          <Text className="text-xs text-neutral-400 dark:text-neutral-700">
            {penalty.missedQuestCount === 1
              ? t("home.penaltyLostCoinsSingular", { coins: penalty.coinsLost })
              : t("home.penaltyLostCoinsPlural", { coins: penalty.coinsLost, days: penalty.missedQuestCount })}
          </Text>
        </View>
      ) : null}

      <View className="gap-1.5">
        <ProgressBar progress={progression.progress} />
        <Text className="text-xs text-neutral-500 dark:text-neutral-600">
          {t("home.xpToNextLevel", { current: progression.currentLevelXp, required: progression.requiredXp })}
        </Text>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1 items-center gap-1 rounded-lg bg-reward/10 py-3">
          <Text className="text-lg font-bold text-reward">{progression.coins}</Text>
          <Text className="text-xs text-neutral-500 dark:text-neutral-600">{t("home.coins")}</Text>
        </View>
        <View className="flex-1 items-center gap-1 rounded-lg bg-reward/10 py-3">
          <Text className="text-lg font-bold text-reward">{progression.currentStreak}</Text>
          <Text className="text-xs text-neutral-500 dark:text-neutral-600">{t("home.streak")}</Text>
        </View>
      </View>

      {stats.statPoints > 0 ? (
        <View className="gap-2">
          <StatAllocator stats={stats} onSubmit={(a) => void handleAllocate(a)} submitting={allocating} />
          {allocateError ? <Text className="text-center text-danger">{allocateError}</Text> : null}
        </View>
      ) : (
        <View className="flex-row flex-wrap gap-x-6 gap-y-2 rounded-lg border border-neutral-700 p-4 dark:border-neutral-400">
          <StatCell label={t("home.statStrength")} value={stats.strength} />
          <StatCell label={t("home.statAgility")} value={stats.agility} />
          <StatCell label={t("home.statEndurance")} value={stats.endurance} />
          <StatCell label={t("home.statVitality")} value={stats.vitality} />
          <StatCell label={t("home.statIntelligence")} value={stats.intelligence} />
        </View>
      )}

      <View className="gap-2 rounded-lg border border-neutral-700 p-4 dark:border-neutral-400">
        <Text className="text-sm font-semibold text-neutral-400 dark:text-neutral-700">{t("home.dailyQuestTitle")}</Text>
        {questState.status === "loading" ? (
          <Text className="text-neutral-500 dark:text-neutral-600">{t("common.loading")}</Text>
        ) : questState.status === "error" ? (
          <ErrorState message={questState.message} onRetry={refetchQuest} retryLabel={t("common.retry")} />
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
          <Text className="text-sm font-semibold text-premium">{t("home.bossQuestTitle")}</Text>
          {bossQuestState.status === "success" && bossQuestState.data.status === "COMPLETED" ? (
            <Text className="text-xs font-bold text-premium">{t("home.bossDefeated")}</Text>
          ) : null}
        </View>
        {bossQuestState.status === "loading" ? (
          <Text className="text-neutral-500 dark:text-neutral-600">{t("common.loading")}</Text>
        ) : bossQuestState.status === "error" ? (
          <ErrorState message={bossQuestState.message} onRetry={refetchBossQuest} retryLabel={t("common.retry")} />
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
                {bossQuestState.data.progress} / {bossQuestState.data.targetSessions} {t("home.bossProgressUnit")}
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
          <Text className="text-sm font-semibold text-accent">{t("home.weeklyQuestTitle")}</Text>
          {weeklyQuestState.status === "success" && weeklyQuestState.data.status === "COMPLETED" ? (
            <Text className="text-xs font-bold text-accent">{t("home.finished")}</Text>
          ) : null}
        </View>
        {weeklyQuestState.status === "loading" ? (
          <Text className="text-neutral-500 dark:text-neutral-600">{t("common.loading")}</Text>
        ) : weeklyQuestState.status === "error" ? (
          <ErrorState message={weeklyQuestState.message} onRetry={refetchWeeklyQuest} retryLabel={t("common.retry")} />
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
            {t("home.mainQuestTitle")}
            {mainQuestState.status === "success" ? ` · TIER ${mainQuestState.data.tier}` : ""}
          </Text>
          {mainQuestState.status === "success" && mainQuestState.data.status === "COMPLETED" ? (
            <Text className="text-xs font-bold text-reward">{t("home.finished")}</Text>
          ) : null}
        </View>
        {mainQuestState.status === "loading" ? (
          <Text className="text-neutral-500 dark:text-neutral-600">{t("common.loading")}</Text>
        ) : mainQuestState.status === "error" ? (
          <ErrorState message={mainQuestState.message} onRetry={refetchMainQuest} retryLabel={t("common.retry")} />
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
            <Text className="text-sm font-semibold text-accent">{t("home.sideQuestTitle")}</Text>
            {sideQuestState.status === "success" && sideQuestState.data && sideQuestState.data.status === "COMPLETED" ? (
              <Text className="text-xs font-bold text-accent">{t("home.finished")}</Text>
            ) : null}
          </View>
          {sideQuestState.status === "loading" ? (
            <Text className="text-neutral-500 dark:text-neutral-600">{t("common.loading")}</Text>
          ) : sideQuestState.status === "error" ? (
            <ErrorState message={sideQuestState.message} onRetry={refetchSideQuest} retryLabel={t("common.retry")} />
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
                  label={t("home.sideQuestCta")}
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
            <Text className="text-sm font-semibold text-danger">{t("home.penaltyQuestTitle")}</Text>
            {penaltyQuestState.status === "success" && penaltyQuestState.data && penaltyQuestState.data.status === "COMPLETED" ? (
              <Text className="text-xs font-bold text-danger">{t("home.finished")}</Text>
            ) : null}
          </View>
          {penaltyQuestState.status === "loading" ? (
            <Text className="text-neutral-500 dark:text-neutral-600">{t("common.loading")}</Text>
          ) : penaltyQuestState.status === "error" ? (
            <ErrorState message={penaltyQuestState.message} onRetry={refetchPenaltyQuest} retryLabel={t("common.retry")} />
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
                  label={t("home.goToWorkout")}
                  variant="secondary"
                  onPress={() => router.push("/exercises")}
                  testID="penalty-quest-cta-button"
                />
              ) : null}
            </>
          ) : null}
        </View>
      )}

      {aiQuestState.status === "success" && aiQuestState.data === null ? null : (
        <View className="gap-2 rounded-lg border border-premium/40 p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-premium">{t("home.aiQuestTitle")}</Text>
            {aiQuestState.status === "success" && aiQuestState.data && aiQuestState.data.status === "COMPLETED" ? (
              <Text className="text-xs font-bold text-premium">{t("home.finished")}</Text>
            ) : null}
          </View>
          {aiQuestState.status === "loading" ? (
            <Text className="text-neutral-500 dark:text-neutral-600">{t("common.loading")}</Text>
          ) : aiQuestState.status === "error" ? (
            <ErrorState message={aiQuestState.message} onRetry={refetchAiQuest} retryLabel={t("common.retry")} />
          ) : aiQuestState.data ? (
            <>
              <Text className="text-base font-semibold text-neutral-50 dark:text-neutral-1000">{aiQuestState.data.title}</Text>
              {aiQuestState.data.description ? (
                <Text className="text-sm text-neutral-500 dark:text-neutral-600">{aiQuestState.data.description}</Text>
              ) : null}
              <ProgressBar
                progress={aiQuestState.data.progress / aiQuestState.data.targetProgress}
                colorClassName="bg-premium"
                testID="ai-quest-progress"
              />
              <View className="flex-row items-center justify-between pt-1">
                <Text className="text-xs text-neutral-500 dark:text-neutral-600">
                  {aiQuestState.data.progress} / {aiQuestState.data.targetProgress} {AI_QUEST_KIND_LABEL[aiQuestState.data.kind] ?? ""}
                </Text>
                <Text className="text-xs text-reward">
                  +{aiQuestState.data.xpReward} XP · +{aiQuestState.data.coinReward} coins
                </Text>
              </View>
              {aiQuestState.data.status !== "COMPLETED" ? (
                <Button
                  label={t("home.goToWorkout")}
                  variant="secondary"
                  onPress={() => router.push("/exercises")}
                  testID="ai-quest-cta-button"
                />
              ) : null}
            </>
          ) : null}
        </View>
      )}

      <View className="gap-3">
        <Button label={t("home.startWorkout")} onPress={() => router.push("/exercises")} testID="start-workout-button" />
        <Button
          label={t("home.myWorkouts")}
          variant="secondary"
          onPress={() => router.push("/workout-templates")}
          testID="workout-templates-button"
        />
        <Button
          label={t("home.workoutHistory")}
          variant="secondary"
          onPress={() => router.push("/workout-history")}
          testID="workout-history-button"
        />
        <Button
          label={t("home.aiTrainingPlan")}
          variant="secondary"
          onPress={() => router.push("/training-plan")}
          testID="training-plan-button"
        />
        <Button
          label={t("home.nutrition")}
          variant="secondary"
          onPress={() => router.push("/nutrition")}
          testID="nutrition-button"
        />
        <Button
          label={t("home.guild")}
          variant="secondary"
          onPress={() => router.push("/guild")}
          testID="guild-button"
        />
        <Button
          label={t("home.friends")}
          variant="secondary"
          onPress={() => router.push("/friends")}
          testID="friends-button"
        />
        <Button
          label={t("home.achievements")}
          variant="secondary"
          onPress={() => router.push("/achievements")}
          testID="achievements-button"
        />
        <Button
          label={t("home.leaderboard")}
          variant="secondary"
          onPress={() => router.push("/leaderboard")}
          testID="leaderboard-button"
        />
        <Button
          label={t("home.shop")}
          variant="secondary"
          onPress={() => router.push("/shop")}
          testID="shop-button"
        />
        <Button
          label={t("home.inventory")}
          variant="secondary"
          onPress={() => router.push("/inventory")}
          testID="inventory-button"
        />
        <Button
          label={t("home.pro")}
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
  const { t } = useI18n();
  return (
    <View className="gap-2 rounded-lg border border-accent/40 bg-accent/10 p-3" testID="active-session-banner">
      <Text className="text-sm font-semibold text-accent">{t("home.activeSessionTitle")}</Text>
      <Text className="text-xs text-neutral-400 dark:text-neutral-700">
        {firstSet
          ? t("home.activeSessionPausedAt", { exercise: firstSet.exerciseName })
          : t("home.activeSessionPausedNoSets")}
      </Text>
      <View className="flex-row gap-3">
        {firstSet ? (
          <Button
            label={t("home.resume")}
            onPress={() =>
              router.push({ pathname: "/workout", params: { exerciseSlug: firstSet.exerciseSlug, resume: "1" } })
            }
            testID="resume-session-button"
          />
        ) : null}
        <Button
          label={t("home.abandon")}
          variant="secondary"
          onPress={() => onAbandon(sessionId)}
          loading={abandoning}
          testID="abandon-session-button"
        />
      </View>
    </View>
  );
}
