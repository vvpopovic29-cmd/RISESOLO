import { useState } from "react";
import { Text, View, Pressable } from "react-native";
import { router } from "expo-router";
import { ApiError } from "@risesolo/api-client";
import type { FriendDto, FriendLeaderboardEntryDto, FriendRequestDto } from "@risesolo/validation";
import { useAuth } from "../src/auth/AuthContext";
import { useFriends } from "../src/friends/use-friends";
import { useFriendsLeaderboard } from "../src/friends/use-friends-leaderboard";
import { useI18n } from "../src/i18n";
import { Button } from "../src/ui/Button";
import { ChoiceGroup } from "../src/ui/ChoiceGroup";
import { ErrorState } from "../src/ui/ErrorState";
import { Screen } from "../src/ui/Screen";
import { TextField } from "../src/ui/TextField";

type Tab = "friends" | "rivals";

export default function FriendsScreen() {
  const { apiClient } = useAuth();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("friends");
  const { state, refetch } = useFriends(apiClient);
  const leaderboard = useFriendsLeaderboard(apiClient);

  const TAB_OPTIONS: ReadonlyArray<{ value: Tab; label: string }> = [
    { value: "friends", label: t("friends.tabFriends") },
    { value: "rivals", label: t("friends.tabRivals") },
  ];

  const [username, setUsername] = useState("");
  const [sending, setSending] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleSendRequest() {
    setSending(true);
    setActionError(null);
    try {
      await apiClient.friends.sendRequest({ username: username.trim() });
      setUsername("");
      refetch();
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : t("friends.sendRequestFailed"));
    } finally {
      setSending(false);
    }
  }

  async function handleAccept(requestId: string) {
    setBusyId(requestId);
    setActionError(null);
    try {
      await apiClient.friends.acceptRequest(requestId);
      refetch();
      leaderboard.refetch();
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : t("friends.acceptFailed"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemoveRequest(requestId: string) {
    setBusyId(requestId);
    setActionError(null);
    try {
      await apiClient.friends.removeRequest(requestId);
      refetch();
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : t("friends.actionFailed"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemoveFriend(userId: string) {
    setBusyId(userId);
    setActionError(null);
    try {
      await apiClient.friends.removeFriend(userId);
      refetch();
      leaderboard.refetch();
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : t("friends.removeFailed"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Screen>
      <Pressable onPress={() => router.back()} testID="friends-back">
        <Text className="text-accent">{t("common.back")}</Text>
      </Pressable>

      <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">{t("friends.title")}</Text>

      <ChoiceGroup label={t("friends.viewLabel")} options={TAB_OPTIONS} value={tab} onChange={setTab} />

      {tab === "friends" ? (
        <>
          <View className="gap-2">
            <TextField
              label={t("friends.usernameLabel")}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              testID="friend-username-input"
            />
            <Button
              label={t("friends.sendRequest")}
              onPress={() => void handleSendRequest()}
              loading={sending}
              disabled={username.trim().length === 0}
              testID="send-friend-request-button"
            />
          </View>

          {actionError ? <Text className="text-center text-danger">{actionError}</Text> : null}

          {state.status === "loading" ? (
            <Text className="text-neutral-500 dark:text-neutral-600">{t("common.loading")}</Text>
          ) : state.status === "error" ? (
            <ErrorState message={state.message} onRetry={refetch} retryLabel={t("common.retry")} testID="friends-error" />
          ) : (
            <>
              {state.data.incomingRequests.length > 0 ? (
                <View className="gap-2">
                  <Text className="text-sm font-semibold text-neutral-400 dark:text-neutral-700">{t("friends.incomingRequestsHeader")}</Text>
                  {state.data.incomingRequests.map((request) => (
                    <IncomingRequestRow
                      key={request.id}
                      request={request}
                      busy={busyId === request.id}
                      onAccept={() => void handleAccept(request.id)}
                      onDecline={() => void handleRemoveRequest(request.id)}
                    />
                  ))}
                </View>
              ) : null}

              {state.data.outgoingRequests.length > 0 ? (
                <View className="gap-2">
                  <Text className="text-sm font-semibold text-neutral-400 dark:text-neutral-700">{t("friends.outgoingRequestsHeader")}</Text>
                  {state.data.outgoingRequests.map((request) => (
                    <OutgoingRequestRow
                      key={request.id}
                      request={request}
                      busy={busyId === request.id}
                      onCancel={() => void handleRemoveRequest(request.id)}
                    />
                  ))}
                </View>
              ) : null}

              <View className="gap-2">
                <Text className="text-sm font-semibold text-neutral-400 dark:text-neutral-700">{t("friends.friendsHeader")}</Text>
                {state.data.friends.length === 0 ? (
                  <Text testID="friends-empty" className="text-center text-neutral-500 dark:text-neutral-600">
                    {t("friends.friendsEmpty")}
                  </Text>
                ) : (
                  state.data.friends.map((friend) => (
                    <FriendRow
                      key={friend.userId}
                      friend={friend}
                      busy={busyId === friend.userId}
                      onRemove={() => void handleRemoveFriend(friend.userId)}
                    />
                  ))
                )}
              </View>
            </>
          )}
        </>
      ) : leaderboard.state.status === "loading" ? (
        <Text className="text-neutral-500 dark:text-neutral-600">{t("common.loading")}</Text>
      ) : leaderboard.state.status === "error" ? (
        <ErrorState message={leaderboard.state.message} onRetry={leaderboard.refetch} retryLabel={t("common.retry")} testID="rivals-error" />
      ) : leaderboard.state.data.entries.length <= 1 ? (
        <Text testID="rivals-empty" className="text-center text-neutral-500 dark:text-neutral-600">
          {t("friends.rivalsEmpty")}
        </Text>
      ) : (
        <RivalsList entries={leaderboard.state.data.entries} />
      )}
    </Screen>
  );
}

function IncomingRequestRow({
  request,
  busy,
  onAccept,
  onDecline,
}: {
  request: FriendRequestDto;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { t } = useI18n();
  return (
    <View
      testID={`incoming-request-${request.id}`}
      className="flex-row items-center justify-between gap-2 rounded-lg border border-neutral-700 p-3 dark:border-neutral-400"
    >
      <Text className="font-semibold text-neutral-50 dark:text-neutral-1000">{request.username}</Text>
      <View className="flex-row gap-2">
        <Button label={t("friends.accept")} onPress={onAccept} loading={busy} testID={`accept-request-${request.id}`} />
        <Button label={t("friends.decline")} variant="secondary" onPress={onDecline} loading={busy} testID={`decline-request-${request.id}`} />
      </View>
    </View>
  );
}

function OutgoingRequestRow({
  request,
  busy,
  onCancel,
}: {
  request: FriendRequestDto;
  busy: boolean;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  return (
    <View
      testID={`outgoing-request-${request.id}`}
      className="flex-row items-center justify-between gap-2 rounded-lg border border-neutral-700 p-3 dark:border-neutral-400"
    >
      <Text className="text-neutral-50 dark:text-neutral-1000">{request.username}</Text>
      <Button label={t("friends.cancel")} variant="secondary" onPress={onCancel} loading={busy} testID={`cancel-request-${request.id}`} />
    </View>
  );
}

function FriendRow({ friend, busy, onRemove }: { friend: FriendDto; busy: boolean; onRemove: () => void }) {
  const { t } = useI18n();
  return (
    <View
      testID={`friend-${friend.userId}`}
      className="flex-row items-center justify-between gap-2 rounded-lg border border-neutral-700 p-3 dark:border-neutral-400"
    >
      <View>
        <Text className="font-semibold text-neutral-50 dark:text-neutral-1000">{friend.username}</Text>
        <Text className="text-xs text-neutral-500 dark:text-neutral-600">
          {t("friends.levelRank", { level: friend.level, rank: friend.rank })}
        </Text>
      </View>
      <Button label={t("friends.remove")} variant="secondary" onPress={onRemove} loading={busy} testID={`remove-friend-${friend.userId}`} />
    </View>
  );
}

function RivalsList({ entries }: { entries: FriendLeaderboardEntryDto[] }) {
  const { t } = useI18n();
  return (
    <View className="gap-2" testID="rivals-list">
      {entries.map((entry) => (
        <View
          key={entry.userId}
          testID={`rival-${entry.userId}`}
          className="flex-row items-center justify-between gap-2 rounded-lg border border-neutral-700 p-3 dark:border-neutral-400"
        >
          <View className="flex-row items-center gap-3">
            <Text className="w-8 text-center font-semibold text-neutral-400 dark:text-neutral-700">#{entry.position}</Text>
            <View>
              <Text className="font-semibold text-neutral-50 dark:text-neutral-1000">{entry.username}</Text>
              <Text className="text-xs text-neutral-500 dark:text-neutral-600">
                {t("friends.levelRank", { level: entry.level, rank: entry.rank })}
              </Text>
            </View>
          </View>
          <Text className="text-sm text-reward">{entry.totalXp} XP</Text>
        </View>
      ))}
    </View>
  );
}
