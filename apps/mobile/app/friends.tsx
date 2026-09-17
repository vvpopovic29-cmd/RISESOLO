import { useState } from "react";
import { Text, View, Pressable } from "react-native";
import { router } from "expo-router";
import { ApiError } from "@risesolo/api-client";
import type { FriendDto, FriendLeaderboardEntryDto, FriendRequestDto } from "@risesolo/validation";
import { useAuth } from "../src/auth/AuthContext";
import { useFriends } from "../src/friends/use-friends";
import { useFriendsLeaderboard } from "../src/friends/use-friends-leaderboard";
import { Button } from "../src/ui/Button";
import { ChoiceGroup } from "../src/ui/ChoiceGroup";
import { ErrorState } from "../src/ui/ErrorState";
import { Screen } from "../src/ui/Screen";
import { TextField } from "../src/ui/TextField";

type Tab = "friends" | "rivals";

const TAB_OPTIONS: ReadonlyArray<{ value: Tab; label: string }> = [
  { value: "friends", label: "Prijatelji" },
  { value: "rivals", label: "Rivali" },
];

export default function FriendsScreen() {
  const { apiClient } = useAuth();
  const [tab, setTab] = useState<Tab>("friends");
  const { state, refetch } = useFriends(apiClient);
  const leaderboard = useFriendsLeaderboard(apiClient);

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
      setActionError(error instanceof ApiError ? error.message : "Slanje zahteva nije uspelo.");
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
      setActionError(error instanceof ApiError ? error.message : "Prihvatanje nije uspelo.");
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
      setActionError(error instanceof ApiError ? error.message : "Akcija nije uspela.");
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
      setActionError(error instanceof ApiError ? error.message : "Uklanjanje nije uspelo.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Screen>
      <Pressable onPress={() => router.back()} testID="friends-back">
        <Text className="text-accent">{"< Nazad"}</Text>
      </Pressable>

      <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">Prijatelji</Text>

      <ChoiceGroup label="Prikaz" options={TAB_OPTIONS} value={tab} onChange={setTab} />

      {tab === "friends" ? (
        <>
          <View className="gap-2">
            <TextField
              label="Korisnicko ime"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              testID="friend-username-input"
            />
            <Button
              label="Posalji zahtev"
              onPress={() => void handleSendRequest()}
              loading={sending}
              disabled={username.trim().length === 0}
              testID="send-friend-request-button"
            />
          </View>

          {actionError ? <Text className="text-center text-danger">{actionError}</Text> : null}

          {state.status === "loading" ? (
            <Text className="text-neutral-500 dark:text-neutral-600">Ucitavam...</Text>
          ) : state.status === "error" ? (
            <ErrorState message={state.message} onRetry={refetch} testID="friends-error" />
          ) : (
            <>
              {state.data.incomingRequests.length > 0 ? (
                <View className="gap-2">
                  <Text className="text-sm font-semibold text-neutral-400 dark:text-neutral-700">DOLAZNI ZAHTEVI</Text>
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
                  <Text className="text-sm font-semibold text-neutral-400 dark:text-neutral-700">POSLATI ZAHTEVI</Text>
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
                <Text className="text-sm font-semibold text-neutral-400 dark:text-neutral-700">PRIJATELJI</Text>
                {state.data.friends.length === 0 ? (
                  <Text testID="friends-empty" className="text-center text-neutral-500 dark:text-neutral-600">
                    Jos uvek nemas nijednog prijatelja.
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
        <Text className="text-neutral-500 dark:text-neutral-600">Ucitavam...</Text>
      ) : leaderboard.state.status === "error" ? (
        <ErrorState message={leaderboard.state.message} onRetry={leaderboard.refetch} testID="rivals-error" />
      ) : leaderboard.state.data.entries.length <= 1 ? (
        <Text testID="rivals-empty" className="text-center text-neutral-500 dark:text-neutral-600">
          Dodaj prijatelje da bi se takmicio sa njima.
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
  return (
    <View
      testID={`incoming-request-${request.id}`}
      className="flex-row items-center justify-between gap-2 rounded-lg border border-neutral-700 p-3 dark:border-neutral-400"
    >
      <Text className="font-semibold text-neutral-50 dark:text-neutral-1000">{request.username}</Text>
      <View className="flex-row gap-2">
        <Button label="Prihvati" onPress={onAccept} loading={busy} testID={`accept-request-${request.id}`} />
        <Button label="Odbij" variant="secondary" onPress={onDecline} loading={busy} testID={`decline-request-${request.id}`} />
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
  return (
    <View
      testID={`outgoing-request-${request.id}`}
      className="flex-row items-center justify-between gap-2 rounded-lg border border-neutral-700 p-3 dark:border-neutral-400"
    >
      <Text className="text-neutral-50 dark:text-neutral-1000">{request.username}</Text>
      <Button label="Otkazi" variant="secondary" onPress={onCancel} loading={busy} testID={`cancel-request-${request.id}`} />
    </View>
  );
}

function FriendRow({ friend, busy, onRemove }: { friend: FriendDto; busy: boolean; onRemove: () => void }) {
  return (
    <View
      testID={`friend-${friend.userId}`}
      className="flex-row items-center justify-between gap-2 rounded-lg border border-neutral-700 p-3 dark:border-neutral-400"
    >
      <View>
        <Text className="font-semibold text-neutral-50 dark:text-neutral-1000">{friend.username}</Text>
        <Text className="text-xs text-neutral-500 dark:text-neutral-600">
          Nivo {friend.level} · Rank {friend.rank}
        </Text>
      </View>
      <Button label="Ukloni" variant="secondary" onPress={onRemove} loading={busy} testID={`remove-friend-${friend.userId}`} />
    </View>
  );
}

function RivalsList({ entries }: { entries: FriendLeaderboardEntryDto[] }) {
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
                Nivo {entry.level} · Rank {entry.rank}
              </Text>
            </View>
          </View>
          <Text className="text-sm text-reward">{entry.totalXp} XP</Text>
        </View>
      ))}
    </View>
  );
}
