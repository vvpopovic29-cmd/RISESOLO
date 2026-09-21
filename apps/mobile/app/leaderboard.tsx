import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import type { GuildLeaderboardEntryDto, PlayerLeaderboardEntryDto } from "@risesolo/validation";
import { useAuth } from "../src/auth/AuthContext";
import { useI18n } from "../src/i18n";
import { useGuildLeaderboard } from "../src/leaderboard/use-guild-leaderboard";
import { usePlayerLeaderboard } from "../src/leaderboard/use-player-leaderboard";
import { ChoiceGroup } from "../src/ui/ChoiceGroup";
import { ErrorState } from "../src/ui/ErrorState";
import { Screen } from "../src/ui/Screen";

type Tab = "players" | "guilds";

export default function LeaderboardScreen() {
  const { apiClient, state: authState } = useAuth();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("players");
  const myUserId = authState.status === "signedIn" ? authState.user.id : undefined;

  const TAB_OPTIONS: ReadonlyArray<{ value: Tab; label: string }> = [
    { value: "players", label: t("leaderboard.tabPlayers") },
    { value: "guilds", label: t("leaderboard.tabGuilds") },
  ];

  const playerLeaderboard = usePlayerLeaderboard(apiClient);
  const guildLeaderboard = useGuildLeaderboard(apiClient);

  return (
    <Screen>
      <Pressable onPress={() => router.back()} testID="leaderboard-back">
        <Text className="text-accent">{t("common.back")}</Text>
      </Pressable>

      <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">{t("leaderboard.title")}</Text>

      <ChoiceGroup label={t("leaderboard.viewLabel")} options={TAB_OPTIONS} value={tab} onChange={setTab} />

      {tab === "players" ? (
        playerLeaderboard.state.status === "loading" ? (
          <Text className="text-neutral-500 dark:text-neutral-600">{t("common.loading")}</Text>
        ) : playerLeaderboard.state.status === "error" ? (
          <ErrorState
            message={playerLeaderboard.state.message}
            onRetry={playerLeaderboard.refetch}
            retryLabel={t("common.retry")}
            testID="leaderboard-players-error"
          />
        ) : (
          <PlayerLeaderboardList data={playerLeaderboard.state.data} myUserId={myUserId} />
        )
      ) : guildLeaderboard.state.status === "loading" ? (
        <Text className="text-neutral-500 dark:text-neutral-600">{t("common.loading")}</Text>
      ) : guildLeaderboard.state.status === "error" ? (
        <ErrorState
          message={guildLeaderboard.state.message}
          onRetry={guildLeaderboard.refetch}
          retryLabel={t("common.retry")}
          testID="leaderboard-guilds-error"
        />
      ) : (
        <GuildLeaderboardList
          entries={guildLeaderboard.state.data.entries}
          myGuild={guildLeaderboard.state.data.myGuild}
        />
      )}
    </Screen>
  );
}

function PlayerLeaderboardList({
  data,
  myUserId,
}: {
  data: { entries: PlayerLeaderboardEntryDto[]; me: PlayerLeaderboardEntryDto };
  myUserId: string | undefined;
}) {
  const { t } = useI18n();
  const meInList = data.entries.some((entry) => entry.userId === myUserId);

  return (
    <View className="gap-2" testID="leaderboard-players-list">
      {data.entries.map((entry) => (
        <PlayerRow key={entry.userId} entry={entry} highlighted={entry.userId === myUserId} />
      ))}
      {!meInList ? (
        <>
          <Text className="pt-2 text-xs text-neutral-500 dark:text-neutral-600">{t("leaderboard.yourPosition")}</Text>
          <PlayerRow entry={data.me} highlighted testID="leaderboard-me-row" />
        </>
      ) : null}
    </View>
  );
}

function PlayerRow({
  entry,
  highlighted,
  testID,
}: {
  entry: PlayerLeaderboardEntryDto;
  highlighted: boolean;
  testID?: string;
}) {
  const { t } = useI18n();
  return (
    <View
      testID={testID ?? `leaderboard-player-${entry.userId}`}
      className={`flex-row items-center justify-between gap-2 rounded-lg border p-3 ${
        highlighted ? "border-accent bg-accent/10" : "border-neutral-700 dark:border-neutral-400"
      }`}
    >
      <View className="flex-row items-center gap-3">
        <Text className="w-8 text-center font-semibold text-neutral-400 dark:text-neutral-700">#{entry.position}</Text>
        <View>
          <Text className="font-semibold text-neutral-50 dark:text-neutral-1000">{entry.username}</Text>
          <Text className="text-xs text-neutral-500 dark:text-neutral-600">
            {t("leaderboard.levelRank", { level: entry.level, rank: entry.rank })}
          </Text>
        </View>
      </View>
      <Text className="text-sm text-reward">{entry.totalXp} XP</Text>
    </View>
  );
}

function GuildLeaderboardList({
  entries,
  myGuild,
}: {
  entries: GuildLeaderboardEntryDto[];
  myGuild: GuildLeaderboardEntryDto | null;
}) {
  const { t } = useI18n();
  const myGuildInList = myGuild !== null && entries.some((entry) => entry.guildId === myGuild.guildId);

  return (
    <View className="gap-2" testID="leaderboard-guilds-list">
      {entries.map((entry) => (
        <GuildRow key={entry.guildId} entry={entry} highlighted={myGuild !== null && entry.guildId === myGuild.guildId} />
      ))}
      {myGuild && !myGuildInList ? (
        <>
          <Text className="pt-2 text-xs text-neutral-500 dark:text-neutral-600">{t("leaderboard.yourGuild")}</Text>
          <GuildRow entry={myGuild} highlighted testID="leaderboard-my-guild-row" />
        </>
      ) : null}
    </View>
  );
}

function GuildRow({
  entry,
  highlighted,
  testID,
}: {
  entry: GuildLeaderboardEntryDto;
  highlighted: boolean;
  testID?: string;
}) {
  const { t } = useI18n();
  return (
    <View
      testID={testID ?? `leaderboard-guild-${entry.guildId}`}
      className={`flex-row items-center justify-between gap-2 rounded-lg border p-3 ${
        highlighted ? "border-accent bg-accent/10" : "border-neutral-700 dark:border-neutral-400"
      }`}
    >
      <View className="flex-row items-center gap-3">
        <Text className="w-8 text-center font-semibold text-neutral-400 dark:text-neutral-700">#{entry.position}</Text>
        <View>
          <Text className="font-semibold text-neutral-50 dark:text-neutral-1000">
            {entry.name} [{entry.tag}]
          </Text>
          <Text className="text-xs text-neutral-500 dark:text-neutral-600">
            {t("leaderboard.levelMembers", { level: entry.level, count: entry.memberCount })}
          </Text>
        </View>
      </View>
      <Text className="text-sm text-reward">{entry.totalXp} XP</Text>
    </View>
  );
}
